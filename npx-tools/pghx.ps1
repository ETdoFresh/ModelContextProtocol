#!/usr/bin/env pwsh
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition; python "$scriptPath\pghx.py" $args
