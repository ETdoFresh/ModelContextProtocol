#!/usr/bin/env python3

import argparse
import os
import re
import subprocess
import sys
import time
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


def uv_run(package_dir, module_name, args):
    # Go to the package directory
    os.chdir(package_dir)
    
    # Run uv sync
    try:
        subprocess.run(['uv', 'sync'], check=True)
    except subprocess.CalledProcessError:
        return False
    
    # Run uv run
    try:
        subprocess.run(['uv', 'run', module_name] + args, check=True)
        return True
    except subprocess.CalledProcessError:
        return False


def main():
    parser = argparse.ArgumentParser(description='Run Python packages directly from GitHub repositories')
    parser.add_argument('github_repo_url', help='GitHub repository URL')
    
    # Parse only the first argument (github_repo_url)
    args, remaining_args = parser.parse_known_args()
    
    # Extract the GitHub repo URL
    github_repo_url = args.github_repo_url
    
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
        
        if package_info['entry_points']:
            # Get the first entry point
            entry_point_name, entry_point_module = next(iter(package_info['entry_points'].items()))
            success = uv_run(package_path, entry_point_name, remaining_args)
        else:
            # If no entry points, run as a module
            module_name = package_info['name'].replace('-', '_')
            success = uv_run(package_path, module_name, remaining_args)
            
        sys.exit(0 if success else 1)
    
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)


if __name__ == '__main__':
    main()
