#!/usr/bin/env pwsh
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
node "$scriptPath\nghx.js" $args
