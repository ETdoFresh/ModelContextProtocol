param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$RepoPath,
    
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$ScriptArgs
)

# Display usage information if help is requested
if ($RepoPath -eq "-h" -or $RepoPath -eq "--help" -or $RepoPath -eq "/?") {
    Write-Host "NGHX - Node GitHub Execute"
    Write-Host "Run JavaScript/TypeScript code directly from GitHub repositories"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  nghx <github-repo-url> [arguments]"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  nghx https://github.com/username/repo"
    Write-Host "  nghx https://github.com/username/repo/tree/main/path/to/directory"
    Write-Host "  nghx https://github.com/username/repo/tree/branch-name"
    Write-Host ""
    Write-Host "Note: The repository must contain JavaScript or TypeScript files."
    exit 0
}

# Configuration
$cacheDir = "$env:LOCALAPPDATA\npm-cache\_nghx"
$tempDir = "$env:TEMP\nghx-temp"

# Create cache directory if it doesn't exist
if (-not (Test-Path $cacheDir)) {
    New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
}

# Create temp directory if it doesn't exist
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
}

# Parse the GitHub repository path
$repoInfo = $RepoPath -match "(?:https?:\/\/)?(?:github\.com\/)?([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?(?:\/(.*))?" | Out-Null
$owner = $Matches[1]
$repo = $Matches[2]
$branch = if ($Matches[3]) { $Matches[3] } else { "main" }
$path = if ($Matches[4]) { $Matches[4] } else { "" }

# Get the commit SHA for the branch
$apiUrl = "https://api.github.com/repos/$owner/$repo/commits/$branch"
$response = Invoke-RestMethod -Uri $apiUrl -ErrorAction Stop
$commitSha = $response.sha.Substring(0, 10) # Use first 10 chars of the SHA
Write-Verbose "Using commit SHA: $commitSha"

# Generate a unique folder name using the commit SHA and path
$uniqueId = if ($path) { "$commitSha-$($path -replace '[\\\/\:\*\?\"\<\>\|]', '_')" } else { $commitSha }
$repoDir = Join-Path $cacheDir $uniqueId

# Check if we already have this repo/path cached and it's not older than 24 hours
$shouldDownload = $true
if (Test-Path $repoDir) {
    $lastModified = (Get-Item $repoDir).LastWriteTime
    if ((Get-Date) - $lastModified -lt [TimeSpan]::FromHours(24)) {
        $shouldDownload = $false
    }
}

# Download the repository if needed
if ($shouldDownload) {
    
    # Clean temp directory
    if (Test-Path $tempDir) {
        Remove-Item -Path "$tempDir\*" -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Download the repository using the commit SHA when available
    $archiveUrl = if ($commitSha -and $commitSha.Length -eq 10) {
        # If we have a valid commit SHA, use it for the download
        "https://github.com/$owner/$repo/archive/$commitSha.zip"
    } else {
        # Fallback to branch-based download
        "https://github.com/$owner/$repo/archive/refs/heads/$branch.zip"
    }
    Write-Verbose "Downloading from: $archiveUrl"
    $zipPath = Join-Path $tempDir "$owner-$repo-$commitSha.zip"
    
    try {
        # Download the zip file
        Invoke-WebRequest -Uri $archiveUrl -OutFile $zipPath -ErrorAction Stop
        
        # Extract the zip file
        Expand-Archive -Path $zipPath -DestinationPath $tempDir -Force
        
        # Find the extracted folder
        $extractedFolder = Get-ChildItem -Path $tempDir -Directory | Select-Object -First 1
        
        # Clean and recreate repo directory
        if (Test-Path $repoDir) {
            Remove-Item -Path $repoDir -Recurse -Force
        }
        New-Item -ItemType Directory -Path $repoDir -Force | Out-Null
        
        # If a specific path is requested, copy just that path
        if ($path) {
            $sourcePath = Join-Path $extractedFolder.FullName $path
            if (Test-Path $sourcePath) {
                if ((Get-Item $sourcePath) -is [System.IO.DirectoryInfo]) {
                    # It's a directory, copy its contents
                    Copy-Item -Path "$sourcePath\*" -Destination $repoDir -Recurse -Force
                } else {
                    # It's a file, copy the file
                    Copy-Item -Path $sourcePath -Destination $repoDir -Force
                }
            } else {
                Write-Error "Path '$path' not found in repository '$owner/$repo'. Please check that the path exists in the repository."
                exit 1
            }
        } else {
            # No specific path, copy the entire repository
            Copy-Item -Path "$($extractedFolder.FullName)\*" -Destination $repoDir -Recurse -Force
        }
        
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Error "Repository not found: https://github.com/$owner/$repo/tree/$branch"
            exit 1
        } elseif ($_.Exception.Message -match "404") {
            Write-Error "Repository or branch not found: https://github.com/$owner/$repo/tree/$branch"
            exit 1
        } else {
            Write-Error "Failed to download repository: $_"
            exit 1
        }
    }
}

# Check if this is an npm package (has package.json)
$packageJsonPath = Join-Path $repoDir "package.json"
$isNpmPackage = Test-Path $packageJsonPath

# Handle npm packages
if ($isNpmPackage) {
    # Read package.json to determine the main script
    $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    
    # Install dependencies
    Push-Location $repoDir
    try {
        npm install --no-fund --no-audit --loglevel=error --silent | Out-Null
    } finally {
        Pop-Location
    }
    
    # Check if the package has build scripts and run them if needed
    $hasBuildScript = $false
    if ($packageJson.scripts -and ($packageJson.scripts.build -or $packageJson.scripts.prepare)) {
        Push-Location $repoDir
        try {
            if ($packageJson.scripts.build) {
                npm run build --if-present --silent | Out-Null
                $hasBuildScript = $true
            } elseif ($packageJson.scripts.prepare) {
                npm run prepare --if-present --silent | Out-Null
                $hasBuildScript = $true
            }
        } finally {
            Pop-Location
        }
    }
    
    # Determine the main script
    $mainScript = if ($packageJson.bin) {
        if ($packageJson.bin -is [string]) {
            $packageJson.bin
        } elseif ($packageJson.bin.PSObject.Properties.Name -contains $packageJson.name) {
            $packageJson.bin.($packageJson.name)
        } else {
            $packageJson.bin.PSObject.Properties | Select-Object -First 1 -ExpandProperty Value
        }
    } elseif ($packageJson.main) {
        $packageJson.main
    } else {
        "index.js"
    }

    # Check if the main script exists
    $mainScriptPath = Join-Path $repoDir $mainScript
    if (-not (Test-Path $mainScriptPath)) {
        # If the main script doesn't exist, try to find it in common locations
        $possiblePaths = @(
            "index.js",
            "src/index.js",
            "lib/index.js",
            "dist/index.js",
            "build/index.js"
        )
        
        $found = $false
        foreach ($possiblePath in $possiblePaths) {
            $testPath = Join-Path $repoDir $possiblePath
            if (Test-Path $testPath) {
                $mainScriptPath = $testPath
                $mainScript = $possiblePath
                $found = $true
                break
            }
        }
        
        if (-not $found) {
            # Look for any .js file
            $jsFiles = Get-ChildItem -Path $repoDir -Filter "*.js" -Recurse | Where-Object { -not $_.PSIsContainer }
            
            if ($jsFiles.Count -eq 0) {
                # If no JS files found, check for TypeScript files
                $tsFiles = Get-ChildItem -Path $repoDir -Filter "*.ts" -Recurse | Where-Object { -not $_.PSIsContainer -and $_.Name -ne "index.d.ts" }
                
                if ($tsFiles.Count -gt 0 -and -not $hasBuildScript) {
                    # Try to compile TypeScript files
                    Push-Location $repoDir
                    try {
                        # Install TypeScript if needed
                        if (-not (Get-Command tsc -ErrorAction SilentlyContinue)) {
                            npm install -g typescript --silent | Out-Null
                        }
                        
                        # Compile TypeScript files
                        if (Test-Path "tsconfig.json") {
                            npm install --silent | Out-Null # Make sure all dependencies are installed
                            npm run build --silent | Out-Null # Try to use the project's build script first
                            
                            # If build script failed or doesn't exist, try direct tsc
                            if ($LASTEXITCODE -ne 0) {
                                tsc | Out-Null
                            }
                        } else {
                            tsc --outDir ./dist *.ts | Out-Null
                        }
                        
                        # Check if compilation produced JS files
                        $jsFiles = Get-ChildItem -Path $repoDir -Filter "*.js" -Recurse | Where-Object { -not $_.PSIsContainer }
                        
                        # If no JS files found in root, check dist directory specifically
                        if ($jsFiles.Count -eq 0 -and (Test-Path "$repoDir/dist")) {
                            $jsFiles = Get-ChildItem -Path "$repoDir/dist" -Filter "*.js" -Recurse | Where-Object { -not $_.PSIsContainer }
                        }
                    } finally {
                        Pop-Location
                    }
                }
                
                if ($jsFiles.Count -eq 0) {
                    Write-Error "No JavaScript files found in the repository '$owner/$repo' at path '$path'."
                    exit 1
                }
            }
            
            # Look for index.js or main.js
            $mainScriptFile = $jsFiles | Where-Object { ($_.Name -eq "index.js" -or $_.Name -eq "main.js") } | Select-Object -First 1
            
            if (-not $mainScriptFile) {
                # If no index.js/main.js, take the first .js file
                $mainScriptFile = $jsFiles | Select-Object -First 1
            }
            
            $mainScriptPath = $mainScriptFile.FullName
            $mainScript = $mainScriptFile.Name
        }
    }

    # Run the script
    Push-Location $repoDir
    try {
        # For MCP servers, check if there's a specific pattern to run
        $fileContent = Get-Content $mainScriptPath -Raw -ErrorAction SilentlyContinue
        if ($mainScript -match "server-.*\.js$" -or $fileContent -match "@modelcontextprotocol") {
            # This appears to be an MCP server, run with current directory as argument
            
            # Make the script executable if it has a shebang
            if ($fileContent -match "^#!") {
                # Skip chmod on Windows as it's not needed - Node.js can run the script without executable permissions
                # On Unix/Linux systems, this would be: chmod +x $mainScriptPath
            }
            
            # Check if we need to install dependencies first
            if (Test-Path (Join-Path $repoDir "package.json")) {
                Push-Location $repoDir
                try {
                    npm install --no-fund --no-audit --loglevel=error --silent | Out-Null
                } finally {
                    Pop-Location
                }
            }
            
            if ($ScriptArgs.Count -gt 0) {
                # Use the provided arguments instead of the default
                node $mainScriptPath $ScriptArgs
            } else {
                # Use the default argument (current directory)
                node $mainScriptPath $repoDir
            }
        } else {
            # Check if we need to run with node or if it's executable
            if ($mainScript -match '\.js$') {
                node $mainScriptPath $ScriptArgs
            } else {
                & $mainScriptPath $ScriptArgs
            }
        }
    } finally {
        Pop-Location
    }
} else {
    # Handle non-npm packages (look for .js files)
    $jsFiles = Get-ChildItem -Path $repoDir -Filter "*.js" -Recurse | Where-Object { -not $_.PSIsContainer }
    
    if ($jsFiles.Count -eq 0) {
        # Try looking for TypeScript files if no JS files found
        $tsFiles = Get-ChildItem -Path $repoDir -Filter "*.ts" -Recurse | Where-Object { -not $_.PSIsContainer -and $_.Name -ne "index.d.ts" }
        
        if ($tsFiles.Count -eq 0) {
            Write-Error "No JavaScript or TypeScript files found in the repository '$owner/$repo' at path '$path'."
            exit 1
        }
        
        # Install TypeScript if needed
        Push-Location $repoDir
        try {
            # Check if there's a package.json for dependencies
            if (Test-Path "package.json") {
                npm install --no-fund --no-audit --loglevel=error --silent | Out-Null
            }
            
            # Install TypeScript globally if needed
            if (-not (Get-Command tsc -ErrorAction SilentlyContinue)) {
                npm install -g typescript --silent | Out-Null
            }
            
            # Compile TypeScript files
            if (Test-Path "tsconfig.json") {
                
                # Check if there's a build script in package.json
                if (Test-Path "package.json") {
                    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
                    if ($packageJson.scripts -and $packageJson.scripts.build) {
                        npm install --silent | Out-Null # Make sure all dependencies are installed
                        npm run build --silent | Out-Null
                    } else {
                        tsc | Out-Null
                    }
                } else {
                    tsc | Out-Null
                }
            } else {
                tsc --outDir ./dist *.ts | Out-Null
            }
            
            # Look for compiled JS files
            $jsFiles = Get-ChildItem -Path $repoDir -Filter "*.js" -Recurse | Where-Object { -not $_.PSIsContainer }
            
            # If no JS files found in root, check dist directory specifically
            if ($jsFiles.Count -eq 0 -and (Test-Path "$repoDir/dist")) {
                $jsFiles = Get-ChildItem -Path "$repoDir/dist" -Filter "*.js" -Recurse | Where-Object { -not $_.PSIsContainer }
            }
            if ($jsFiles.Count -eq 0) {
                Write-Error "Failed to compile TypeScript files in repository '$owner/$repo' at path '$path'."
                exit 1
            }
        } finally {
            Pop-Location
        }
    }
    
    # Look for index.js or main.js at the root level
    $mainScript = $jsFiles | Where-Object { ($_.Name -eq "index.js" -or $_.Name -eq "main.js") -and $_.DirectoryName -eq $repoDir } | Select-Object -First 1
    
    # If no index.js/main.js at root, look for them anywhere
    if (-not $mainScript) {
        $mainScript = $jsFiles | Where-Object { $_.Name -eq "index.js" -or $_.Name -eq "main.js" } | Select-Object -First 1
    }
    
    # If still not found, take the first .js file
    if (-not $mainScript) {
        $mainScript = $jsFiles | Select-Object -First 1
    }
    
    Push-Location $repoDir
    try {
        # For MCP servers, check if there's a specific pattern to run
        $fileContent = Get-Content $mainScript.FullName -Raw -ErrorAction SilentlyContinue
        if ($mainScript.Name -match "server-.*\.js$" -or $fileContent -match "@modelcontextprotocol") {
            # This appears to be an MCP server, run with the current directory as argument
            
            # Make the script executable if it has a shebang
            if ($fileContent -match "^#!") {
                # Skip chmod on Windows as it's not needed - Node.js can run the script without executable permissions
                # On Unix/Linux systems, this would be: chmod +x $mainScript.FullName
            }
            
            # Check if we need to install dependencies first
            if (Test-Path (Join-Path $repoDir "package.json")) {
                Push-Location $repoDir
                try {
                    npm install --no-fund --no-audit --loglevel=error --silent | Out-Null
                } finally {
                    Pop-Location
                }
            }
            
            if ($ScriptArgs.Count -gt 0) {
                # Use the provided arguments instead of the default
                node $mainScript.FullName $ScriptArgs
            } else {
                # Use the default argument (current directory)
                node $mainScript.FullName $repoDir
            }
        } else {
            # Regular JS file
            node $mainScript.FullName $ScriptArgs
        }
    } finally {
        Pop-Location
    }
}