#!/usr/bin/env python3

import argparse
import os
import re
import subprocess
import sys
import json
import time
import shutil
from pathlib import Path


def parse_github_url(url):
    """Parse GitHub URL to extract owner, repo, branch and subpath."""
    print(f"Parsing GitHub URL: {url}")
    
    # Extract owner/repo/branch/path from URL
    github_regex = r'^https://github\.com/([^/]+)/([^/]+)(?:/tree/([^/]+)(?:/(.+))?)?$'
    match = re.match(github_regex, url)
    
    if not match:
        print(f"Invalid GitHub URL format: {url}")
        sys.exit(1)
    
    owner = match.group(1)
    repo = match.group(2)
    # Remove .git extension if present
    if repo.endswith('.git'):
        repo = repo[:-4]
    
    branch = match.group(3) or 'main'
    sub_path = match.group(4) or ''
    
    print("Parsed URL components:")
    print(f"- Owner: {owner}")
    print(f"- Repo: {repo}")
    print(f"- Branch: {branch}")
    print(f"- SubPath: {sub_path or '(root)'}")
    
    return owner, repo, branch, sub_path


def get_cache_dir():
    """Get the cache directory for storing cloned repositories."""
    # Use the same cache directory as npm
    cache_dir = os.path.join(os.path.expanduser("~"), "AppData", "Local", "npm-cache", "_nghx")
    os.makedirs(cache_dir, exist_ok=True)
    return cache_dir


def prepare_repository(owner, repo, branch, cache_dir):
    """Clone or update repository."""
    repo_dir = os.path.join(cache_dir, owner, repo, branch)
    print(f"Repository directory: {repo_dir}")
    
    # Check if directory exists
    if os.path.exists(repo_dir):
        print('Repository already exists. Checking for updates...')
        
        # Check when the repository was last pulled
        last_pull_file = os.path.join(repo_dir, 'last-pull.txt')
        pull_needed = True
        
        if os.path.exists(last_pull_file):
            try:
                with open(last_pull_file, 'r') as f:
                    last_pull_time = int(f.read().strip())
                    current_time = int(time.time() * 1000)
                    time_diff = (current_time - last_pull_time) / 1000 / 60  # minutes
                    print(f"Last pull was {time_diff:.2f} minutes ago")
                    
                    # Only pull if it's been more than 5 minutes
                    if time_diff < 5:
                        pull_needed = False
                        print(f"Skipping pull as it's been less than 5 minutes")
            except Exception as e:
                print(f"Error reading last pull time: {e}")
        
        if pull_needed:
            print("Pulling latest changes...")
            try:
                result = subprocess.run(
                    ['git', 'pull', 'origin', branch],
                    cwd=repo_dir,
                    capture_output=True,
                    text=True,
                    check=True
                )
                print(f"Pull successful: {result.stdout.strip()}")
                
                # Update last pull time
                with open(last_pull_file, 'w') as f:
                    f.write(str(int(time.time() * 1000)))
                print(f"Updated last-pull.txt with timestamp: {int(time.time() * 1000)}")
            except subprocess.CalledProcessError as e:
                print(f"Warning: Failed to pull latest changes: {e.stderr}")
                print("Continuing with existing repository...")
    else:
        print(f"Cloning repository {owner}/{repo}#{branch}...")
        os.makedirs(os.path.dirname(repo_dir), exist_ok=True)
        
        clone_url = f"https://github.com/{owner}/{repo}.git"
        try:
            subprocess.run(
                ['git', 'clone', '-b', branch, clone_url, repo_dir],
                capture_output=True,
                text=True,
                check=True
            )
            print("Repository cloned successfully.")
            
            # Create last pull time file
            with open(os.path.join(repo_dir, 'last-pull.txt'), 'w') as f:
                f.write(str(int(time.time() * 1000)))
        except subprocess.CalledProcessError as e:
            print(f"Failed to clone repository: {e.stderr}")
            sys.exit(1)
    
    return repo_dir


def get_package_info(package_path):
    """Get package information from pyproject.toml or setup.py."""
    package_path = Path(package_path)
    
    # Check for pyproject.toml
    pyproject_toml = package_path / 'pyproject.toml'
    if pyproject_toml.exists():
        print(f"Found pyproject.toml: {pyproject_toml}")
        try:
            with open(pyproject_toml, 'r') as f:
                content = f.read()
                
                # Extract package name
                name_match = re.search(r'name\s*=\s*["\']([^"\']+)["\']', content)
                if name_match:
                    package_name = name_match.group(1)
                    print(f"Package name from pyproject.toml: {package_name}")
                    
                    # Extract entry point
                    scripts_match = re.search(r'\[project\.scripts\]\s*([^\[]+)', content)
                    if scripts_match:
                        scripts_section = scripts_match.group(1)
                        entry_points = {}
                        
                        for line in scripts_section.strip().split('\n'):
                            if '=' in line:
                                key, value = line.split('=', 1)
                                key = key.strip()
                                value = value.strip().strip('"\'')
                                entry_points[key] = value
                        
                        if entry_points:
                            print(f"Found entry points: {entry_points}")
                            return {
                                'name': package_name,
                                'entry_points': entry_points
                            }
                    
                    # If no entry points found, return just the name
                    return {
                        'name': package_name,
                        'entry_points': {}
                    }
        except Exception as e:
            print(f"Error parsing pyproject.toml: {e}")
    
    # Check for setup.py
    setup_py = package_path / 'setup.py'
    if setup_py.exists():
        print(f"Found setup.py: {setup_py}")
        try:
            with open(setup_py, 'r') as f:
                content = f.read()
                
                # Extract package name
                name_match = re.search(r'name=["\']([^"\']+)["\']', content)
                if name_match:
                    package_name = name_match.group(1)
                    print(f"Package name from setup.py: {package_name}")
                    return {
                        'name': package_name,
                        'entry_points': {}
                    }
        except Exception as e:
            print(f"Error parsing setup.py: {e}")
    
    # If no package info found, use directory name
    package_name = package_path.name.replace('-', '_')
    print(f"Using directory name as package name: {package_name}")
    return {
        'name': package_name,
        'entry_points': {}
    }


def is_uv_available():
    """Check if uv is available in the system."""
    return shutil.which('uv') is not None


def install_package(package_path):
    """Install the package using uv if available, otherwise pip."""
    print(f"Installing package from {package_path}...")
    
    # Check if uv is available
    use_uv = is_uv_available()
    if use_uv:
        print("Using uv package manager for installation")
        
        # Create a virtual environment if it doesn't exist
        venv_path = os.path.join(package_path, '.venv')
        if not os.path.exists(venv_path):
            print(f"Creating virtual environment at {venv_path}...")
            try:
                result = subprocess.run(
                    ['uv', 'venv', '.venv'],
                    cwd=package_path,
                    capture_output=True,
                    text=True,
                    check=True
                )
                print("Virtual environment created successfully.")
            except subprocess.CalledProcessError as e:
                print(f"Failed to create virtual environment: {e.stderr}")
                print("Falling back to system installation...")
    else:
        print("Using pip for installation (uv not found)")
    
    try:
        if use_uv:
            # Install with uv in development mode
            result = subprocess.run(
                ['uv', 'pip', 'install', '-e', '.'],
                cwd=package_path,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                print("Development mode installation failed, trying regular install...")
                # If that fails, try regular install
                result = subprocess.run(
                    ['uv', 'pip', 'install', '.'],
                    cwd=package_path,
                    capture_output=True,
                    text=True,
                    check=True
                )
        else:
            # Install with pip in development mode
            result = subprocess.run(
                [sys.executable, '-m', 'pip', 'install', '-e', '.'],
                cwd=package_path,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                print("Development mode installation failed, trying regular install...")
                # If that fails, try regular install
                result = subprocess.run(
                    [sys.executable, '-m', 'pip', 'install', '.'],
                    cwd=package_path,
                    capture_output=True,
                    text=True,
                    check=True
                )
        
        print("Package installed successfully.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to install package: {e.stderr}")
        return False


def run_direct_module(package_path, module_path, function_name, args):
    """Run a module directly from its path without installation."""
    print(f"Running module directly: {module_path}.{function_name}")
    print(f"Arguments: {args}")
    
    # Create a temporary script to import and run the function
    temp_script = f"""
#!/usr/bin/env python3
import sys
import os
from pathlib import Path

# Add the package path to sys.path
package_path = Path('{package_path}')
src_dir = package_path / 'src'
if src_dir.exists():
    sys.path.insert(0, str(src_dir))
sys.path.insert(0, str(package_path))

# Try to import the module and run the function
try:
    from {module_path} import {function_name}
    sys.exit({function_name}())
except ImportError as e:
    print(f"Import error: {{e}}")
    sys.exit(1)
"""
    
    temp_file = Path(os.path.join(os.getcwd(), "_temp_run.py"))
    temp_file.write_text(temp_script)
    
    cmd = [sys.executable, str(temp_file)] + args
    print(f"Command: {' '.join(cmd)}")
    
    try:
        subprocess.run(cmd, check=True)
        temp_file.unlink()  # Remove the temporary file
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to run module function: {e}")
        temp_file.unlink()  # Remove the temporary file
        return False
    except Exception as e:
        print(f"Error running module function: {e}")
        temp_file.unlink()  # Remove the temporary file
        return False


def run_module_function(module_name, function_name, args):
    """Run a specific function from a module."""
    print(f"Running function {function_name} from module {module_name}")
    print(f"Arguments: {args}")
    
    # Create a temporary script to import and run the function
    temp_script = f"""
#!/usr/bin/env python3
import sys
from {module_name} import {function_name}
sys.exit({function_name}())
"""
    
    temp_file = Path(os.path.join(os.getcwd(), "_temp_run.py"))
    temp_file.write_text(temp_script)
    
    cmd = [sys.executable, str(temp_file)] + args
    print(f"Command: {' '.join(cmd)}")
    
    try:
        subprocess.run(cmd, check=True)
        temp_file.unlink()  # Remove the temporary file
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to run module function: {e}")
        temp_file.unlink()  # Remove the temporary file
        return False
    except Exception as e:
        print(f"Error running module function: {e}")
        temp_file.unlink()  # Remove the temporary file
        return False


def run_module(module_name, args):
    """Run a Python module with the provided arguments."""
    print(f"Running module: {module_name}")
    print(f"Arguments: {args}")
    
    cmd = [sys.executable, '-m', module_name] + args
    print(f"Command: {' '.join(cmd)}")
    
    try:
        subprocess.run(cmd, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to run module: {e}")
        return False


def get_current_commit_sha(repo_dir):
    """Get the current git commit SHA."""
    try:
        result = subprocess.run(
            ['git', 'rev-parse', 'HEAD'],
            cwd=repo_dir,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error getting current commit SHA: {e.stderr}")
        return None


def needs_dependency_installation(package_path, repo_dir):
    """Check if dependencies need to be installed based on commit SHA."""
    try:
        last_update_file = os.path.join(package_path, 'last-update.txt')
        
        if not os.path.exists(last_update_file):
            return True
        
        with open(last_update_file, 'r') as f:
            last_commit_sha = f.read().strip()
        
        current_commit_sha = get_current_commit_sha(repo_dir)
        
        if not current_commit_sha:
            # If we can't get the current SHA, assume we need to install
            return True
        
        print(f"Last installation commit: {last_commit_sha}")
        print(f"Current commit: {current_commit_sha}")
        
        # Return true if the commit SHA has changed
        return last_commit_sha != current_commit_sha
    except Exception as e:
        print(f"Error checking dependency installation status: {e}")
        # If there's an error, assume dependencies need to be installed
        return True


def update_last_dependency_install_sha(package_path, repo_dir):
    """Update the last-update.txt file with current commit SHA."""
    try:
        last_update_file = os.path.join(package_path, 'last-update.txt')
        current_commit_sha = get_current_commit_sha(repo_dir)
        
        if current_commit_sha:
            with open(last_update_file, 'w') as f:
                f.write(current_commit_sha)
            print(f"Updated last-update.txt with commit SHA: {current_commit_sha}")
    except Exception as e:
        print(f"Error updating last dependency installation SHA: {e}")
        # Continue execution even if writing the SHA fails


def main():
    parser = argparse.ArgumentParser(description='Run Python packages directly from GitHub repositories')
    parser.add_argument('github_repo_url', help='GitHub repository URL')
    parser.add_argument('--no-install', action='store_true', help='Run directly without installing the package')
    
    # Parse only the first argument (github_repo_url)
    args, remaining_args = parser.parse_known_args()
    
    # Extract the GitHub repo URL
    github_repo_url = args.github_repo_url
    no_install = args.no_install
    
    try:
        # Parse GitHub URL
        owner, repo, branch, sub_path = parse_github_url(github_repo_url)
        
        # Get cache directory
        cache_dir = get_cache_dir()
        
        # Prepare repository (clone or update)
        repo_dir = prepare_repository(owner, repo, branch, cache_dir)
        
        # Determine the package path
        package_path = repo_dir
        if sub_path:
            package_path = os.path.join(repo_dir, sub_path)
        
        print(f"Package path: {package_path}")
        
        # Get package information
        package_info = get_package_info(package_path)
        
        if no_install:
            print("Skipping installation as --no-install flag is set")
            # Try to run the package directly
            if package_info['entry_points']:
                # Get the first entry point
                entry_point_name, entry_point_module = next(iter(package_info['entry_points'].items()))
                
                # Parse the module and function name from the entry point
                if ':' in entry_point_module:
                    module_name, function_name = entry_point_module.split(':', 1)
                    
                    # Run the module directly from its path
                    success = run_direct_module(package_path, module_name, function_name, remaining_args)
                    sys.exit(0 if success else 1)
                else:
                    # If no specific function is specified, run the module
                    success = run_module(entry_point_module, remaining_args)
                    sys.exit(0 if success else 1)
            else:
                # If no entry points, run as a module
                module_name = package_info['name'].replace('-', '_')
                success = run_module(module_name, remaining_args)
                sys.exit(0 if success else 1)
        else:
            # Check if dependencies need to be installed
            if needs_dependency_installation(package_path, repo_dir):
                # Install the package
                if install_package(package_path):
                    # Update the last dependency installation SHA
                    update_last_dependency_install_sha(package_path, repo_dir)
                    
                    # Try to run using entry point if available
                    if package_info['entry_points']:
                        # Get the first entry point
                        entry_point_name, entry_point_module = next(iter(package_info['entry_points'].items()))
                        
                        # Parse the module and function name from the entry point
                        if ':' in entry_point_module:
                            module_name, function_name = entry_point_module.split(':', 1)
                            
                            # Try to run the function directly
                            success = run_module_function(module_name, function_name, remaining_args)
                            sys.exit(0 if success else 1)
                        else:
                            # If no specific function is specified, run the module
                            success = run_module(entry_point_module, remaining_args)
                            sys.exit(0 if success else 1)
                    else:
                        # If no entry points, run as a module
                        module_name = package_info['name'].replace('-', '_')
                        success = run_module(module_name, remaining_args)
                        sys.exit(0 if success else 1)
                else:
                    sys.exit(1)
            else:
                print("Dependencies are up-to-date, skipping installation.")
                
                # Try to run using entry point if available
                if package_info['entry_points']:
                    # Get the first entry point
                    entry_point_name, entry_point_module = next(iter(package_info['entry_points'].items()))
                    
                    # Parse the module and function name from the entry point
                    if ':' in entry_point_module:
                        module_name, function_name = entry_point_module.split(':', 1)
                        
                        # Try to run the function directly
                        success = run_module_function(module_name, function_name, remaining_args)
                        sys.exit(0 if success else 1)
                    else:
                        # If no specific function is specified, run the module
                        success = run_module(entry_point_module, remaining_args)
                        sys.exit(0 if success else 1)
                else:
                    # If no entry points, run as a module
                    module_name = package_info['name'].replace('-', '_')
                    success = run_module(module_name, remaining_args)
                    sys.exit(0 if success else 1)
    
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)


if __name__ == '__main__':
    main()
