const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets', 'TR');
const outputFile = path.join(__dirname, 'lib', 'ImageMap.ts');

// 讀取 assets 資料夾底下所有的內容
const items = fs.readdirSync(assetsDir);

// 過濾出「資料夾」(排除掉 .db 檔或單獨的圖片檔)
const shopFolders = items.filter(item => {
  return fs.statSync(path.join(assetsDir, item)).isDirectory();
});

let outputCode = `// 這是自動產生的檔案，請勿手動修改！\n`;
outputCode += `export const ShopImages: { [key: string]: any[] } = {\n`;

// generateImage.js 建議修改片段
shopFolders.forEach(folder => {
  const folderPath = path.join(assetsDir, folder);
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  
  outputCode += `  '${folder}': [\n`;
  files.forEach(file => {
    outputCode += `    require('../assets/TR/${folder}/${file}'),\n`;
  });
  outputCode += `  ],\n`;
});

outputCode += `};\n\n`;
outputCode += `export const DefaultImage = require('../assets/a_table_of_rice.jpg');\n`;

// 寫入到 lib/ImageMap.ts
fs.writeFileSync(outputFile, outputCode);
console.log(`✨ 成功！已自動掃描 ${shopFolders.length} 間店家，並產生 ImageMap.ts！`);