import request from 'supertest';
import app from '../src/';



describe('GET /health', () => {
  it('debería responder con estado 200 y estructura válida', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('fileProcessing');
    expect(response.body).toHaveProperty('lastProcessingStatus');
    expect(response.body).toHaveProperty('processedRecords');
    expect(response.body).toHaveProperty('errorRecords');
  });
});
