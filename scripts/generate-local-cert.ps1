$ErrorActionPreference = "Stop"

$certDir = Join-Path $PSScriptRoot "..\certs"
$caKey = Join-Path $certDir "local-dev-ca-key.pem"
$caCert = Join-Path $certDir "local-dev-ca.pem"
$serverKey = Join-Path $certDir "local-server-key.pem"
$serverCsr = Join-Path $certDir "local-server.csr"
$serverCert = Join-Path $certDir "local-server-cert.pem"
$caConfig = Join-Path $certDir "local-dev-ca.cnf"
$serverConfig = Join-Path $certDir "local-server.cnf"
$serverExt = Join-Path $certDir "local-server.ext"

New-Item -ItemType Directory -Force -Path $certDir | Out-Null

$ipAddresses = @("127.0.0.1", "::1")
$activeIpv4 = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notlike "169.254.*" -and
    $_.IPAddress -ne "127.0.0.1" -and
    $_.PrefixOrigin -ne "WellKnown"
  } |
  Sort-Object InterfaceMetric, InterfaceIndex |
  Select-Object -ExpandProperty IPAddress -First 1

if ($activeIpv4) {
  $ipAddresses += $activeIpv4
}

$sanEntries = @("DNS.1 = localhost")
$index = 1
foreach ($ip in $ipAddresses) {
  $sanEntries += "IP.$index = $ip"
  $index += 1
}

@" 
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_ca
prompt = no

[req_distinguished_name]
CN = Whiteboard Local Dev CA

[v3_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
"@ | Set-Content -LiteralPath $caConfig -Encoding ascii

@"
[req]
distinguished_name = req_distinguished_name
prompt = no

[req_distinguished_name]
CN = localhost
"@ | Set-Content -LiteralPath $serverConfig -Encoding ascii

@"
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
$($sanEntries -join "`n")
"@ | Set-Content -LiteralPath $serverExt -Encoding ascii

if (-not (Test-Path -LiteralPath $caKey) -or -not (Test-Path -LiteralPath $caCert)) {
  openssl genrsa -out $caKey 4096
  openssl req -x509 -new -nodes -key $caKey -sha256 -days 3650 -out $caCert -config $caConfig
}

openssl genrsa -out $serverKey 2048
openssl req -new -key $serverKey -out $serverCsr -config $serverConfig
openssl x509 -req -in $serverCsr -CA $caCert -CAkey $caKey -CAcreateserial -out $serverCert -days 825 -sha256 -extfile $serverExt

certutil -user -addstore Root $caCert | Out-Null

Remove-Item -LiteralPath $serverCsr -Force -ErrorAction SilentlyContinue

Write-Host "Generated HTTPS cert:"
Write-Host "  $serverCert"
Write-Host "Generated HTTPS key:"
Write-Host "  $serverKey"
Write-Host "Trusted CA:"
Write-Host "  $caCert"
Write-Host "SAN:"
foreach ($entry in $sanEntries) {
  Write-Host "  $entry"
}
