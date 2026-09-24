const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const templatePath = path.join(__dirname, 'template.json');

// Создаем дефолтный шаблон, если его нет
if (!fs.existsSync(templatePath)) {
    fs.writeFileSync(templatePath, JSON.stringify({
        subject: "Запись на сессию - WaveProdMusic",
        textBody: "Привет, {name}!\n\nВы успешно оставили заявку на сессию в WaveProdMusic.\n\nВаша заявка:\nУслуга: {service}\nЖелаемая дата: {date}\nУказанный телефон: {phone}\n\nНаш администратор свяжется с вами в ближайшее время для подтверждения деталей. Ждем вас на студии!"
    }, null, 2));
}

// Получить текущий шаблон
app.get('/api/template', (req, res) => {
    try {
        const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
        res.json(template);
    } catch(e) {
        res.status(500).json({ error: 'Failed to read template' });
    }
});

// Сохранить новый шаблон
app.post('/api/template', (req, res) => {
    try {
        fs.writeFileSync(templatePath, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ success: false, error: 'Failed to save template' });
    }
});

// Отправка email
app.post('/api/book', async (req, res) => {
    const { name, email, phone, service, date } = req.body;

    try {
        let transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: "nykhayp@gmail.com", 
                pass: "ihrf hqps rgsc vjhs", 
            },
        });

        // Загружаем шаблон
        const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
        const formattedDate = new Date(date).toLocaleString('ru-RU');
        
        // Подставляем переменные
        const subject = template.subject
            .replace(/{name}/g, name)
            .replace(/{service}/g, service);
            
        let processedText = template.textBody || '';
        processedText = processedText
            .replace(/{name}/g, name)
            .replace(/{email}/g, email)
            .replace(/{phone}/g, phone || 'Не указан')
            .replace(/{service}/g, service)
            .replace(/{date}/g, formattedDate);

        // Превращаем переносы строк в <br>
        const htmlContent = processedText.replace(/\n/g, '<br>');
        
        // Оборачиваем в стильный фирменный дизайн WaveMusic
        const finalHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px 20px; background-color: #05010a; color: #fff;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #0a0216; border-radius: 12px; border: 1px solid #1c0638; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div style="background: linear-gradient(90deg, #370e58 0%, #04000b 100%); padding: 25px; text-align: center; border-bottom: 2px solid #9d4edd;">
                    <h1 style="color: #fff; letter-spacing: 3px; margin: 0; font-size: 24px; font-weight: 700;">WAVE<span style="color: #9d4edd;">MUSIC</span></h1>
                </div>
                
                <div style="padding: 35px; font-size: 16px; line-height: 1.7; color: #e0e0e0;">
                    ${htmlContent}
                </div>
                
                <div style="background-color: #04000b; text-align: center; padding: 25px; border-top: 1px solid #1c0638;">
                    <p style="color: #888; font-size: 13px; margin: 0;">С уважением, команда WaveProdMusic 🎧</p>
                    <p style="color: #444; font-size: 11px; margin-top: 8px;">Это письмо сформировано автоматически. Пожалуйста, не отвечайте на него.</p>
                </div>
            </div>
        </div>`;

        let info = await transporter.sendMail({
            from: '"WaveProdMusic 🎧" <nykhayp@gmail.com>',
            to: email, 
            subject: subject,
            html: finalHtml
        });

        console.log("Сообщение успешно отправлено на реальную почту: %s", info.messageId);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Ошибка при отправке письма: ", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log(`Waiting for booking requests...`);
});
