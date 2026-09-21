import { apiClient } from './api-client.js';

export const VisaService = {
  async getVisas(filters = {}) {
    return await apiClient.get('/visas', filters);
  },
  async getVisaById(id) {
    return await apiClient.get(`/visas/${id}`);
  },
  async createVisa(data) {
    return await apiClient.post('/visas', data);
  },
  async updateVisa(visaId, data) {
    return await apiClient.patch(`/visas/${visaId}`, data);
  },
  async deleteVisa(visaId) {
    return await apiClient.delete(`/visas/${visaId}`);
  }
};
