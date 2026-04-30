const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const htmlPath = path.resolve(__dirname, 'proposta_comercial.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });

  // Aguarda fontes do Google carregarem
  await page.waitForTimeout(2000);

  const outputPath = path.resolve(__dirname, 'proposta_fasttenis.pdf');

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();

  console.log(`✓ PDF gerado: ${outputPath}`);
})();
