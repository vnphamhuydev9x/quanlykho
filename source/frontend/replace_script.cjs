const fs = require('fs');
const files = [
  'src/pages/merchandiseCondition/MerchandiseConditionPage.jsx',
  'src/pages/merchandiseCondition/MerchandiseConditionModal.jsx',
  'src/locales/vi/translation.json',
  'src/locales/zh/translation.json'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/MerchandiseStatus/g, 'MerchandiseCondition');
  content = content.replace(/merchandiseStatus/g, 'merchandiseCondition');
  content = content.replace(/statuses/g, 'conditions');
  content = content.replace(/editingStatus/g, 'editingCondition');
  content = content.replace(/newStatus/g, 'newCondition');
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Replaced in ${file}`);
});
