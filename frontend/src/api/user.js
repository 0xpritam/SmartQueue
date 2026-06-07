import api from './auth';

/**
 * Update current patient profile details
 * @param {Object} profileData - contains name, email, phone, age
 */
export const updateProfile = async (profileData) => {
  const res = await api.put('/users/profile', profileData);
  return res.data;
};
