import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './VendorPages.css';
import './VendorProfile.css';

interface VendorProfileData {
  username: string;
  email: string;
  businessName: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  btcPayServerUrl: string;
  createdAt: string;
  vacationMode: boolean;
}

export function VendorProfile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<VendorProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<VendorProfileData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isUpdatingVacationMode, setIsUpdatingVacationMode] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get('http://localhost:3000/api/vendors/profile', { headers });
      
      const profileData = response.data.data.profile;
      setProfileData(profileData);
      setFormData(profileData);
    } catch (err: any) {
      console.error('Error fetching profile data:', err);
      setError('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleVacationModeToggle = async () => {
    try {
      setIsUpdatingVacationMode(true);
      setError('');
      setSuccessMessage('');
      
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const newVacationMode = !profileData?.vacationMode;
      
      await axios.put(
        'http://localhost:3000/api/vendors/vacation-mode', 
        { vacationMode: newVacationMode }, 
        { headers }
      );
      
      setProfileData(prev => prev ? { ...prev, vacationMode: newVacationMode } : null);
      setSuccessMessage(`Vacation mode ${newVacationMode ? 'enabled' : 'disabled'} successfully`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err: any) {
      console.error('Error updating vacation mode:', err);
      setError(err.response?.data?.message || 'Failed to update vacation mode');
    } finally {
      setIsUpdatingVacationMode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.put('http://localhost:3000/api/vendors/profile', formData, { headers });
      
      setProfileData(prev => ({ ...prev!, ...formData }));
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading profile data...</div>;
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Vendor Profile</h1>
        {!isEditing && (
          <button 
            className="btn btn-primary"
            onClick={() => setIsEditing(true)}
          >
            Edit Profile
          </button>
        )}
      </header>

      <div className="vendor-content">
        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}

        <div className="vacation-mode-toggle">
          <div className="vacation-title">
            <h2>Vacation Mode</h2>
            <div className={`vacation-status ${profileData?.vacationMode ? 'active' : 'inactive'}`}>
              {profileData?.vacationMode ? 'Enabled' : 'Disabled'}
            </div>
          </div>
          <p className="vacation-description">
            When vacation mode is enabled, your cards will be hidden from buyers and you won't receive new orders.
            Existing orders will still be processed.
          </p>
          <button 
            className={`btn ${profileData?.vacationMode ? 'btn-warning' : 'btn-outline'}`}
            onClick={handleVacationModeToggle}
            disabled={isUpdatingVacationMode}
          >
            {isUpdatingVacationMode 
              ? 'Updating...' 
              : profileData?.vacationMode 
                ? 'Disable Vacation Mode' 
                : 'Enable Vacation Mode'
            }
          </button>
        </div>

        <div className="profile-container">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-section">
                <h2>Business Information</h2>
                
                <div className="form-group">
                  <label htmlFor="businessName">Business Name</label>
                  <input
                    id="businessName"
                    type="text"
                    name="businessName"
                    value={formData.businessName || ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="description">Business Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description || ''}
                    onChange={handleChange}
                    rows={4}
                  />
                </div>
              </div>
              
              <div className="form-section">
                <h2>Contact Information</h2>
                
                <div className="form-group">
                  <label htmlFor="contactEmail">Contact Email</label>
                  <input
                    id="contactEmail"
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail || ''}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="contactPhone">Contact Phone</label>
                  <input
                    id="contactPhone"
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="form-section">
                <h2>Payment Settings</h2>
                
                <div className="form-group">
                  <label htmlFor="btcPayServerUrl">BTCPay Server URL</label>
                  <input
                    id="btcPayServerUrl"
                    type="url"
                    name="btcPayServerUrl"
                    value={formData.btcPayServerUrl || ''}
                    onChange={handleChange}
                    placeholder="https://your-btcpay-server.com"
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-outline"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(profileData || {});
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-view">
              <div className="profile-section">
                <h2>Business Information</h2>
                
                <div className="profile-field">
                  <span className="field-label">Business Name</span>
                  <span className="field-value">{profileData?.businessName || 'Not set'}</span>
                </div>
                
                <div className="profile-field">
                  <span className="field-label">Business Description</span>
                  <p className="field-value description">{profileData?.description || 'No description provided'}</p>
                </div>
                
                <div className="profile-field">
                  <span className="field-label">Member Since</span>
                  <span className="field-value">{profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : 'Unknown'}</span>
                </div>
              </div>
              
              <div className="profile-section">
                <h2>Account Information</h2>
                
                <div className="profile-field">
                  <span className="field-label">Username</span>
                  <span className="field-value">{profileData?.username}</span>
                </div>
                
                <div className="profile-field">
                  <span className="field-label">Email</span>
                  <span className="field-value">{profileData?.email}</span>
                </div>
              </div>
              
              <div className="profile-section">
                <h2>Contact Information</h2>
                
                <div className="profile-field">
                  <span className="field-label">Contact Email</span>
                  <span className="field-value">{profileData?.contactEmail || 'Not set'}</span>
                </div>
                
                <div className="profile-field">
                  <span className="field-label">Contact Phone</span>
                  <span className="field-value">{profileData?.contactPhone || 'Not set'}</span>
                </div>
              </div>
              
              <div className="profile-section">
                <h2>Payment Settings</h2>
                
                <div className="profile-field">
                  <span className="field-label">BTCPay Server URL</span>
                  <span className="field-value">
                    {profileData?.btcPayServerUrl ? (
                      <a href={profileData.btcPayServerUrl} target="_blank" rel="noopener noreferrer">
                        {profileData.btcPayServerUrl}
                      </a>
                    ) : (
                      'Not configured'
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 