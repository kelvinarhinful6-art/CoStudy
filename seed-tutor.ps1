$ErrorActionPreference = "Stop"
$base = "http://localhost:8080"
function POST($path, $bodyObj) { return Invoke-RestMethod -Method Post -Uri "$base$path" -ContentType "application/json" -Body ($bodyObj | ConvertTo-Json -Depth 6) }
function PATCHj($path, $bodyObj) { return Invoke-RestMethod -Method Patch -Uri "$base$path" -ContentType "application/json" -Body ($bodyObj | ConvertTo-Json -Depth 6) }
function PUTj($path, $bodyObj) { return Invoke-RestMethod -Method Put -Uri "$base$path" -ContentType "application/json" -Body ($bodyObj | ConvertTo-Json -Depth 6) }

Write-Host "1) (Optional) Admin uploads the PHY101 assessment PDF applicants will download..."
$sample = Join-Path $env:TEMP "phy101-assessment.pdf"
"%PDF-1.4`nSample PHY101 assessment questions. Solve these and upload with your CV." | Set-Content -Path $sample -Encoding ascii
try {
  Invoke-RestMethod -Method Post -Uri "$base/api/courses/PHY101/question-file" -Form @{ file = Get-Item $sample } | Out-Null
  Write-Host "   uploaded assessment PDF for PHY101"
} catch {
  Write-Host "   (skipped assessment upload: $($_.Exception.Message))"
}

Write-Host "2) Tutor adjoa applies for PHY101 (documents-only process)..."
$app = POST "/api/tutor-applications" @{ userId="adjoa"; courseId="PHY101" }
$appId = $app.applicationId
Write-Host "   applicationId = $appId  status = $($app.status)"   # AWAITING_DOCUMENTS

Write-Host "3) Applicant uploads a completed document (solved assessment + CV)..."
$doc = Join-Path $env:TEMP "adjoa-application.pdf"
"%PDF-1.4`nSolved answers + CV for adjoa." | Set-Content -Path $doc -Encoding ascii
Invoke-RestMethod -Method Post -Uri "$base/api/tutor-applications/$appId/upload" -Form @{ file = Get-Item $doc } | Out-Null

Write-Host "4) Applicant submits the application for review..."
$submitted = POST "/api/tutor-applications/$appId/submit" @{}
Write-Host "   status = $($submitted.status)"   # UNDER_REVIEW

Write-Host "5) Admin approves..."
PATCHj "/api/admin/tutor-applications/$appId/approve" @{ adminId="me"; notes="ok" } | Out-Null

Write-Host "6) Setting hourly rate GHS 80..."
PUTj "/api/tutors/adjoa/rate" @{ courseId="PHY101"; hourlyRate=80 } | Out-Null

Write-Host ""
Write-Host "DONE. Tutor adjoa is approved and bookable for PHY101 at 80 GHS/hr."
