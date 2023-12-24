const dotenv = require('dotenv').config();
const express = require('express');
const Sequelize = require('sequelize');
const bodyParser = require('body-parser');
const cors = require('cors');
const openai = require('openai');

// Database configuration
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: 'localhost',
    dialect: 'mysql'
});

// Define model
const CustomerInteraction = sequelize.define('customer_interaction', {
    customer_name: Sequelize.STRING,
    email: Sequelize.STRING,
    phone: Sequelize.STRING,
    message: Sequelize.TEXT,
    response: Sequelize.TEXT,
    created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    }
}, {
    // Disable Sequelize's automatic timestamp fields
    timestamps: false
});

// Set OpenAI API Key
const openaiClient = new openai.OpenAI(process.env.OPENAI_API_KEY);

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/process_request', async (req, res) => {
    const user_input = req.body.user_input || '';

    // Adjusted regular expressions for parsing name, email, and phone
    const nameRegex = /name is ([\w\s]+)(?:,|\.| my email is)/i; // Adjusted to capture full name
    const emailRegex = /\S+@\S+/;
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;

    // Extract information
    let customer_name = nameRegex.test(user_input) ? user_input.match(nameRegex)[1].trim() : null;
    let email = emailRegex.test(user_input) ? user_input.match(emailRegex)[0] : null;
    let phone = phoneRegex.test(user_input) ? user_input.match(phoneRegex)[0] : null;

    // Construct a response based on the extracted information
    let botResponse = "Thank you";
    if (customer_name) {
        botResponse += ` ${customer_name}`;
    }
    botResponse += ". We have received your information.";

    // OpenAI API call to generate a more personalized response 
    try {
        const response = await openaiClient.completions.create({
            model: "text-davinci-003",
            prompt: `Generate a polite response to a customer who has just provided their contact details.\n\nCustomer's Name: ${customer_name}\nEmail: ${email}\nPhone: ${phone}\n\nBot: \n and ask if theres anything else you can help them with.`,
            max_tokens: 800
        });
        botResponse += "\n\n" + response.choices[0].text.trim();

        // Save interaction to database
        await CustomerInteraction.create({
            customer_name: customer_name,
            email: email,
            phone: phone,
            message: user_input,
            response: botResponse
        });

        res.json({ response: botResponse });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Error processing request" });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
