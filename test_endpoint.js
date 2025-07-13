const fetch = require('node-fetch');

async function testChatbot() {
  try {
    console.log('Testing chatbot endpoint...');
    
    const response = await fetch('http://localhost:8080/v1/chatbot/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: '¿Cómo está mi densidad ósea?',
        patientId: '66955bbf8b55fd3b498af3ad'
      })
    });

    const data = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', data);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testChatbot();