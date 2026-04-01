const fetch = require('node-fetch');

async function testLogin() {
  try {
    const response = await fetch('https://srv-d75r4vnfte5s73fftv00.onrender.com/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@gmail.com',
        password: 'password123' // Assuming this is the password
      })
    });

    const data = await response.json();
    console.log('Login response:', data);
  } catch (err) {
    console.error('Login test failed:', err.message);
  }
}

testLogin();