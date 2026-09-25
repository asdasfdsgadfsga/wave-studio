const fs = require('fs');
const path = require('path');

function generateSamplesManifest() {
    const samplesDir = path.join(__dirname, 'samples');
    if (!fs.existsSync(samplesDir)) {
        console.error('Directory samples/ not found');
        return [];
    }

    const entries = fs.readdirSync(samplesDir, { withFileTypes: true });
    const result = [];

    // Подпапки (категории сэмплов)
    entries.forEach(entry => {
        if (entry.isDirectory()) {
            const folderPath = path.join(samplesDir, entry.name);
            const subFiles = fs.readdirSync(folderPath, { withFileTypes: true })
                .filter(f => f.isFile() && f.name.match(/\.(wav|mp3|ogg|flac|aif|aiff|m4a)$/i))
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                .map(f => ({
                    name: f.name,
                    url: `samples/${encodeURIComponent(entry.name)}/${encodeURIComponent(f.name)}`
                }));

            if (subFiles.length > 0) {
                result.push({
                    folder: entry.name,
                    files: subFiles
                });
            }
        }
    });

    // Корневые файлы
    const rootFiles = entries
        .filter(f => f.isFile() && f.name.match(/\.(wav|mp3|ogg|flac|aif|aiff|m4a)$/i))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
        .map(f => ({
            name: f.name,
            url: `samples/${encodeURIComponent(f.name)}`
        }));

    if (rootFiles.length > 0) {
        result.unshift({
            folder: 'Общие сэмплы',
            files: rootFiles
        });
    }

    const jsonContent = JSON.stringify(result, null, 2);

    // Сохраняем в корень (samples.json) и внутрь папки samples (samples/samples.json)
    const rootManifest = path.join(__dirname, 'samples.json');
    fs.writeFileSync(rootManifest, jsonContent, 'utf-8');
    console.log(`Generated root manifest: ${rootManifest} (${result.length} categories)`);

    const subManifest = path.join(samplesDir, 'samples.json');
    fs.writeFileSync(subManifest, jsonContent, 'utf-8');
    console.log(`Generated samples/ folder manifest: ${subManifest}`);

    return result;
}

if (require.main === module) {
    const list = generateSamplesManifest();
    let total = 0;
    list.forEach(item => total += item.files.length);
    console.log(`Successfully generated manifest with ${list.length} categories and ${total} sample files.`);
}

module.exports = { generateSamplesManifest };
