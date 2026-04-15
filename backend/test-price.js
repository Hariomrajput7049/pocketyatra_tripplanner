import axios from 'axios';

async function testAccommodationAPI() {
  try {
    console.log('🧪 Testing Accommodation API with Serp API...');
    
    const response = await axios.post('http://localhost:5000/api/search-hotels', {
      location: 'Bali',
      checkIn: '2025-10-24',
      checkOut: '2025-10-25'
    });
    
    console.log('✅ API Test Successful!');
    console.log('📊 Response Summary:');
    console.log(`   - Hotels found: ${response.data.hotels?.length || 0}`);
    console.log(`   - Success: ${response.data.success}`);
    
    if (response.data.hotels && response.data.hotels.length > 0) {
      console.log('\n🏨 First Hotel Details:');
      const firstHotel = response.data.hotels[0];
      console.log(`   - Name: ${firstHotel.name}`);
      console.log(`   - Location: ${firstHotel.location}`);
      console.log(`   - Rating: ${firstHotel.rating}`);
      console.log(`   - Price: ₹${firstHotel.pricePerNight}/night`);
      console.log(`   - Amenities: ${firstHotel.amenities?.join(', ') || 'N/A'}`);
      console.log(`   - Reviews: ${firstHotel.reviews || 'N/A'}`);
      console.log(`   - Class: ${firstHotel.hotelClass || 'N/A'}`);
    }
    
  } catch (error) {
    console.log('❌ API Test Failed!');
    console.log('Error:', error.response?.data || error.message);
  }
}

testAccommodationAPI();
