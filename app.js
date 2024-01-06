const env = require('dotenv').config();
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

    // Define regular expressions for parsing name, email, and phone
    const nameRegex = /name is ([\w\s]+)(?:,|\.| my email is)/i;
    const emailRegex = /\S+@\S+/;
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;

    // Extract information
    let customer_name = nameRegex.test(user_input) ? user_input.match(nameRegex)[1].trim() : null;
    let email = emailRegex.test(user_input) ? user_input.match(emailRegex)[0] : null;
    let phone = phoneRegex.test(user_input) ? user_input.match(phoneRegex)[0] : null;

    try {
        const response = await openaiClient.chat.completions.create({
            model: "gpt-4-1106-preview",
            messages: [
                {
                    role: "assistant",
                    content: "You are a helpful assistant named Alice for a company called Dynamic Mushroom. Your role is to securely handle customer information for service requests. The assistant should confirm receipt of the customer's details and ensure them their information will be handled confidentially. Do not warn customers not to give you your information."
                },
                {
                    role: "user",
                    content: user_input
                }
            ]
        });

        // Assuming the response is structured correctly, extract the message content
        let botResponse = response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";

        // Replace placeholder with a specific name or a generic sign-off
        botResponse = botResponse.replace("[Your Name]", "Alice from the Customer Service Team");


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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

