const { getHuman, imageBase64ToTensor } = require('./dist/services/human');

async function testHuman() {
  try {
    console.log('Testing Human library...');
    
    // Test with a simple base64 image
    const testImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
    
    console.log('Loading Human library...');
    const human = await getHuman();
    console.log('Human library loaded successfully');
    
    console.log('Converting image to tensor...');
    const tensor = await imageBase64ToTensor(testImage);
    console.log('Tensor created:', tensor.shape);
    
    console.log('Running face detection...');
    const result = await human.detect(tensor);
    console.log('Detection result:', {
      faces: result.face?.length || 0,
      hasDescriptions: result.face?.some(face => face.embedding) || false
    });
    
    if (result.face && result.face.length > 0) {
      console.log('✅ Face detected!');
      console.log('Face embedding length:', result.face[0].embedding?.length || 0);
    } else {
      console.log('❌ No face detected');
    }
    
    tensor.dispose();
    console.log('Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testHuman();
