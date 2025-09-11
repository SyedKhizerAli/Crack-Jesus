import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './AdminPages.css';
import './AdminSettings.css';

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  vendorRegistrationEnabled: boolean;
  minWithdrawalAmount: number;
  maxWithdrawalAmount: number;
  platformFeePercentage: number;
  commissionSplitEnabled: boolean;
  commissionSplitPercentage: number;
  paymentHoldPeriodMinutes: number;
  contactEmail: string;
  supportEmail: string;
}

export function AdminSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>({
    siteName: '',
    siteDescription: '',
    maintenanceMode: false,
    registrationEnabled: true,
    vendorRegistrationEnabled: true,
    minWithdrawalAmount: 10,
    maxWithdrawalAmount: 1000,
    platformFeePercentage: 5,
    commissionSplitEnabled: false,
    commissionSplitPercentage: 50,
    paymentHoldPeriodMinutes: 5,
    contactEmail: '',
    supportEmail: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get('http://localhost:3000/api/admin/settings', { headers });
      
      setSettings(response.data.data.settings);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError('Failed to load system settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setSettings(prev => ({ ...prev, [name]: target.checked }));
    } else if (type === 'number') {
      setSettings(prev => ({ ...prev, [name]: parseFloat(value) }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
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
      
      await axios.put('http://localhost:3000/api/admin/settings', settings, { headers });
      
      setSuccessMessage('Settings updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err: any) {
      console.error('Error updating settings:', err);
      setError(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>System Settings</h1>
      </header>

      <div className="admin-content">
        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}

        <div className="settings-container">
          <form className="settings-form" onSubmit={handleSubmit}>
            <div className="settings-section">
              <h2>General Settings</h2>
              
              <div className="form-group">
                <label htmlFor="siteName">Site Name</label>
                <input
                  id="siteName"
                  type="text"
                  name="siteName"
                  value={settings.siteName}
                  onChange={handleChange}
                  placeholder="Enter site name"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="siteDescription">Site Description</label>
                <textarea
                  id="siteDescription"
                  name="siteDescription"
                  value={settings.siteDescription}
                  onChange={handleChange}
                  placeholder="Enter site description"
                  rows={3}
                />
              </div>
              
              <div className="form-group checkbox-group">
                <label htmlFor="maintenanceMode">
                  <input
                    id="maintenanceMode"
                    type="checkbox"
                    name="maintenanceMode"
                    checked={settings.maintenanceMode}
                    onChange={handleChange}
                  />
                  Maintenance Mode
                </label>
                <p className="field-description">When enabled, only admins can access the site.</p>
              </div>
            </div>
            
            <div className="settings-section">
              <h2>Registration Settings</h2>
              
              <div className="form-group checkbox-group">
                <label htmlFor="registrationEnabled">
                  <input
                    id="registrationEnabled"
                    type="checkbox"
                    name="registrationEnabled"
                    checked={settings.registrationEnabled}
                    onChange={handleChange}
                  />
                  Enable User Registration
                </label>
              </div>
              
              <div className="form-group checkbox-group">
                <label htmlFor="vendorRegistrationEnabled">
                  <input
                    id="vendorRegistrationEnabled"
                    type="checkbox"
                    name="vendorRegistrationEnabled"
                    checked={settings.vendorRegistrationEnabled}
                    onChange={handleChange}
                  />
                  Enable Vendor Registration
                </label>
              </div>
            </div>
            
            <div className="settings-section">
              <h2>Financial Settings</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="minWithdrawalAmount">Minimum Withdrawal Amount</label>
                  <input
                    id="minWithdrawalAmount"
                    type="number"
                    name="minWithdrawalAmount"
                    value={settings.minWithdrawalAmount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="maxWithdrawalAmount">Maximum Withdrawal Amount</label>
                  <input
                    id="maxWithdrawalAmount"
                    type="number"
                    name="maxWithdrawalAmount"
                    value={settings.maxWithdrawalAmount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="platformFeePercentage">Platform Fee Percentage</label>
                <input
                  id="platformFeePercentage"
                  type="number"
                  name="platformFeePercentage"
                  value={settings.platformFeePercentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                />
                <p className="field-description">Percentage fee charged on each transaction.</p>
              </div>

              <div className="form-group checkbox-group">
                <label htmlFor="commissionSplitEnabled">
                  <input
                    id="commissionSplitEnabled"
                    type="checkbox"
                    name="commissionSplitEnabled"
                    checked={settings.commissionSplitEnabled}
                    onChange={handleChange}
                  />
                  Enable Commission Split
                </label>
                <p className="field-description">
                  When enabled, sales revenue will be split between the platform and vendors
                  according to the percentage below.
                </p>
              </div>
              
              <div className="form-group">
                <label htmlFor="commissionSplitPercentage">Commission Split Percentage</label>
                <input
                  id="commissionSplitPercentage"
                  type="number"
                  name="commissionSplitPercentage"
                  value={settings.commissionSplitPercentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="1"
                  disabled={!settings.commissionSplitEnabled}
                />
                <p className="field-description">
                  Percentage of each sale that goes to the platform. For example, 50% means the platform
                  gets half and the vendor gets half.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="paymentHoldPeriodMinutes">Payment Hold Period (minutes)</label>
                <input
                  id="paymentHoldPeriodMinutes"
                  type="number"
                  name="paymentHoldPeriodMinutes"
                  value={settings.paymentHoldPeriodMinutes}
                  onChange={handleChange}
                  min="0"
                  step="1"
                />
                <p className="field-description">
                  Time in minutes to hold payments before releasing to vendors. During this time,
                  buyers can verify cards and request refunds if necessary.
                </p>
              </div>
            </div>
            
            <div className="settings-section">
              <h2>Contact Information</h2>
              
              <div className="form-group">
                <label htmlFor="contactEmail">Contact Email</label>
                <input
                  id="contactEmail"
                  type="email"
                  name="contactEmail"
                  value={settings.contactEmail}
                  onChange={handleChange}
                  placeholder="Enter contact email"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="supportEmail">Support Email</label>
                <input
                  id="supportEmail"
                  type="email"
                  name="supportEmail"
                  value={settings.supportEmail}
                  onChange={handleChange}
                  placeholder="Enter support email"
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={fetchSettings}
              >
                Reset
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 