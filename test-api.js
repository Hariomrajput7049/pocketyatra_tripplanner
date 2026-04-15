const axios = require('axios');

async function testAccommodationAPI() {
  try {
    const response = await axios.post('http://localhost:5000/api/search-hotels', {
      location: 'Goa',
      checkIn: '2024-01-15',
      checkOut: '2024-01-18'
    });
    
    console.log('✅ API Test Successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ API Test Failed!');
    console.log('Error:', error.response?.data || error.message);
  }
}

testAccommodationAPI();
