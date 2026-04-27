const fs = require('fs');
const path = require('path');

// Read the processing.js file
const filePath = path.join(__dirname, 'utils', 'processing.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Starting conversion...');

// Pattern 1: Convert Promise.all pattern with updateOne
// This matches: const updatePromises = records.map(async (record) => { ... await collection.updateOne(...) }); await Promise.all(updatePromises);
const pattern1 = /const updatePromises = records\.map\(async \(record\) => \{([\s\S]*?)await collection\.updateOne\(\s*\{ _id: record\._id \},\s*\{ \$set: updateData \},\s*\{ upsert: true \}\s*\);([\s\S]*?)\}\);[\s\n]*await Promise\.all\(updatePromises\);/g;

let conversionCount = 0;

content = content.replace(pattern1, (match, beforeUpdate, afterUpdate) => {
  conversionCount++;
  
  // Extract the logic before updateOne (calculating updateData)
  const logic = beforeUpdate.trim();
  
  // Check if there's a try-catch wrapper
  const hasTryCatch = logic.includes('try {');
  
  if (hasTryCatch) {
    // Remove try-catch wrapper
    const cleanLogic = logic
      .replace(/try \{[\s\n]*/, '')
      .replace(/\} catch.*?\{[\s\S]*?\}[\s\n]*$/, '');
    
    return `await bulkUpdateRecords(collection, records, (record) => {
${cleanLogic}
    return updateData;
  });`;
  } else {
    return `await bulkUpdateRecords(collection, records, (record) => {
${logic}
    return updateData;
  });`;
  }
});

// Pattern 2: Convert simple map pattern without try-catch
const pattern2 = /\/\/ for \(const record of records\) \{[\s\n]*const updatePromises = records\.map\(async \(record\) => \{([\s\S]*?)await collection\.updateOne\(\s*\{ _id: record\._id \},\s*\{ \$set: updateData \},\s*\{ upsert: true \}\s*\);[\s\n]*\}\);[\s\n]*await Promise\.all\(updatePromises\);/g;

content = content.replace(pattern2, (match, logic) => {
  conversionCount++;
  const cleanLogic = logic.trim();
  
  return `await bulkUpdateRecords(collection, records, (record) => {
${cleanLogic}
    return updateData;
  });`;
});

// Pattern 3: Handle cases where updateData is defined with let
const pattern3 = /const updatePromises = records\.map\(async \(record\) => \{([\s\S]*?)let updateData = \{([\s\S]*?)\};([\s\S]*?)await collection\.updateOne\(\s*\{ _id: record\._id \},\s*\{ \$set: updateData \},\s*\{ upsert: true \}\s*\);([\s\S]*?)\}\);[\s\n]*await Promise\.all\(updatePromises\);/g;

content = content.replace(pattern3, (match, beforeData, dataContent, betweenDataAndUpdate, afterUpdate) => {
  conversionCount++;
  const logic = (beforeData + 'let updateData = {' + dataContent + '};' + betweenDataAndUpdate).trim();
  
  return `await bulkUpdateRecords(collection, records, (record) => {
${logic}
    return updateData;
  });`;
});

// Pattern 4: Handle updateData declared as const
const pattern4 = /const updatePromises = records\.map\(async \(record\) => \{([\s\S]*?)const updateData = \{([\s\S]*?)\};[\s\n]*await collection\.updateOne\(\s*\{ _id: record\._id \},\s*\{ \$set: updateData \},\s*\{ upsert: true \}\s*\);([\s\S]*?)\}\);[\s\n]*await Promise\.all\(updatePromises\);/g;

content = content.replace(pattern4, (match, beforeData, dataContent, afterUpdate) => {
  conversionCount++;
  const logic = (beforeData + 'const updateData = {' + dataContent + '};').trim();
  
  return `await bulkUpdateRecords(collection, records, (record) => {
${logic}
    return updateData;
  });`;
});

// Write the updated content back
fs.writeFileSync(filePath, content, 'utf8');

console.log(`✅ Conversion complete!`);
console.log(`📊 Total measures converted: ${conversionCount}`);
console.log(`📁 File updated: ${filePath}`);
