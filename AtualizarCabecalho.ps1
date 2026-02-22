# AtualizarCabecalho.ps1
# Execute este script no PowerShell para selecionar a imagem do cabeçalho,
# copiá-la para o projeto e fazer o commit automaticamente.

Add-Type -AssemblyName System.Windows.Forms

$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title  = "Selecione a imagem do cabeçalho da escola"
$dialog.Filter = "Imagens (*.jpg;*.jpeg;*.png)|*.jpg;*.jpeg;*.png"

if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    $src  = $dialog.FileName
    $dest = "assets\images\cabecalho-vc.jpg"

    Copy-Item -Path $src -Destination $dest -Force
    $size = (Get-Item $dest).Length
    Write-Host "Imagem copiada: $dest ($size bytes)"

    if ($size -lt 200) {
        Write-Error "Arquivo muito pequeno ($size bytes). Certifique-se de selecionar a imagem correta."
        exit 1
    }

    git add $dest
    git commit -m "chore: add real school header image"
    git push origin master
    Write-Host "`n✅ Imagem commitada e enviada ao GitHub. O Vercel vai fazer o deploy automaticamente."
} else {
    Write-Host "Cancelado."
}
