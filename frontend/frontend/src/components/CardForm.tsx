import React, { useState, useEffect } from 'react';
import './CardForm.css';

interface CardFormProps {
  initialValues?: {
    number?: string;
    holderName?: string;
    expiryMonth?: number;
    expiryYear?: number;
    cvv?: string;
    type?: string;
    price?: number;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    phoneNumber?: string;
    ssn?: string;
    dob?: string;
    email?: string;
    notes?: string;
  };
  onSubmit: (formData: any) => void;
  isLoading?: boolean;
  submitButtonText?: string;
}

export function CardForm({ 
  initialValues = {}, 
  onSubmit, 
  isLoading = false,
  submitButtonText = 'Submit'
}: CardFormProps) {
  const [formData, setFormData] = useState({
    number: '',
    holderName: '',
    expiryMonth: undefined as number | undefined,
    expiryYear: undefined as number | undefined,
    cvv: '',
    type: 'Visa',
    price: undefined as number | undefined,
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    phoneNumber: '',
    ssn: '',
    dob: '',
    email: '',
    notes: '',
    ...initialValues
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let parsedValue: any = value;
    if (type === 'number') {
      parsedValue = value ? Number(value) : undefined;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
    
    // Clear the error for this field when it's changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    // Required fields
    if (!formData.number) {
      newErrors.number = 'Card number is required';
    } else if (!/^\d{16}$/.test(formData.number)) {
      newErrors.number = 'Card number must be 16 digits';
    }
    
    if (!formData.holderName) {
      newErrors.holderName = 'Cardholder name is required';
    }
    
    if (!formData.expiryMonth) {
      newErrors.expiryMonth = 'Expiry month is required';
    }
    
    if (!formData.expiryYear) {
      newErrors.expiryYear = 'Expiry year is required';
    }
    
    if (!formData.cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (!/^\d{3,4}$/.test(formData.cvv)) {
      newErrors.cvv = 'CVV must be 3 or 4 digits';
    }
    
    if (!formData.type) {
      newErrors.type = 'Card type is required';
    }
    
    if (!formData.price) {
      newErrors.price = 'Price is required';
    }
    
    // Optional fields with format validation
    if (formData.zipCode && !/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
      newErrors.zipCode = 'Zip code must be in format 12345 or 12345-6789';
    }
    
    if (formData.phoneNumber && !/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
      newErrors.phoneNumber = 'Phone number must contain 10 digits';
    }
    
    if (formData.ssn && !/^\d{3}-?\d{2}-?\d{4}$/.test(formData.ssn)) {
      newErrors.ssn = 'SSN must be in format 123-45-6789';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      // Format the data before submission
      const formattedData = {
        ...formData,
        cardDetails: {
          number: formData.number,
          holderName: formData.holderName,
          expiryMonth: formData.expiryMonth,
          expiryYear: formData.expiryYear,
          cvv: formData.cvv,
          type: formData.type,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zipCode: formData.zipCode || undefined,
          country: formData.country || undefined,
          phoneNumber: formData.phoneNumber || undefined,
          ssn: formData.ssn || undefined,
          dob: formData.dob || undefined,
          email: formData.email || undefined,
          notes: formData.notes || undefined
        },
        price: formData.price
      };
      
      onSubmit(formattedData);
    }
  };

  // Generate year options (current year + 10 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear + i);

  return (
    <form className="card-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3>Card Details</h3>
        
        <div className="form-group">
          <label htmlFor="number">Card Number <span className="required">*</span></label>
          <input
            type="text"
            id="number"
            name="number"
            maxLength={16}
            placeholder="1234567890123456"
            value={formData.number}
            onChange={handleChange}
            className={errors.number ? 'error' : ''}
          />
          {errors.number && <div className="error-message">{errors.number}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="holderName">Cardholder Name <span className="required">*</span></label>
          <input
            type="text"
            id="holderName"
            name="holderName"
            placeholder="John Doe"
            value={formData.holderName}
            onChange={handleChange}
            className={errors.holderName ? 'error' : ''}
          />
          {errors.holderName && <div className="error-message">{errors.holderName}</div>}
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="expiryMonth">Expiry Month <span className="required">*</span></label>
            <select
              id="expiryMonth"
              name="expiryMonth"
              value={formData.expiryMonth}
              onChange={handleChange}
              className={errors.expiryMonth ? 'error' : ''}
            >
              <option value="">Month</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>
                  {month.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
            {errors.expiryMonth && <div className="error-message">{errors.expiryMonth}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="expiryYear">Expiry Year <span className="required">*</span></label>
            <select
              id="expiryYear"
              name="expiryYear"
              value={formData.expiryYear}
              onChange={handleChange}
              className={errors.expiryYear ? 'error' : ''}
            >
              <option value="">Year</option>
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            {errors.expiryYear && <div className="error-message">{errors.expiryYear}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="cvv">CVV <span className="required">*</span></label>
            <input
              type="text"
              id="cvv"
              name="cvv"
              maxLength={4}
              placeholder="123"
              value={formData.cvv}
              onChange={handleChange}
              className={errors.cvv ? 'error' : ''}
            />
            {errors.cvv && <div className="error-message">{errors.cvv}</div>}
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="type">Card Type <span className="required">*</span></label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              className={errors.type ? 'error' : ''}
            >
              <option value="Visa">Visa</option>
              <option value="Mastercard">Mastercard</option>
              <option value="Amex">American Express</option>
            </select>
            {errors.type && <div className="error-message">{errors.type}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="price">Price ($) <span className="required">*</span></label>
            <input
              type="number"
              id="price"
              name="price"
              min="0"
              step="0.01"
              placeholder="99.99"
              value={formData.price}
              onChange={handleChange}
              className={errors.price ? 'error' : ''}
            />
            {errors.price && <div className="error-message">{errors.price}</div>}
          </div>
        </div>
      </div>
      
      <div className="form-section">
        <h3>Customer Information</h3>
        
        <div className="form-group">
          <label htmlFor="address">Address</label>
          <input
            type="text"
            id="address"
            name="address"
            placeholder="123 Main St"
            value={formData.address}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="city">City</label>
            <input
              type="text"
              id="city"
              name="city"
              placeholder="New York"
              value={formData.city}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="state">State</label>
            <input
              type="text"
              id="state"
              name="state"
              placeholder="NY"
              value={formData.state}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="zipCode">Zip Code</label>
            <input
              type="text"
              id="zipCode"
              name="zipCode"
              placeholder="10001"
              value={formData.zipCode}
              onChange={handleChange}
              className={errors.zipCode ? 'error' : ''}
            />
            {errors.zipCode && <div className="error-message">{errors.zipCode}</div>}
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="country">Country</label>
          <select
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="UK">United Kingdom</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="ES">Spain</option>
            <option value="IT">Italy</option>
            <option value="JP">Japan</option>
          </select>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <input
              type="text"
              id="phoneNumber"
              name="phoneNumber"
              placeholder="1234567890"
              value={formData.phoneNumber}
              onChange={handleChange}
              className={errors.phoneNumber ? 'error' : ''}
            />
            {errors.phoneNumber && <div className="error-message">{errors.phoneNumber}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="ssn">Social Security Number</label>
            <input
              type="text"
              id="ssn"
              name="ssn"
              placeholder="123-45-6789"
              value={formData.ssn}
              onChange={handleChange}
              className={errors.ssn ? 'error' : ''}
            />
            {errors.ssn && <div className="error-message">{errors.ssn}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="dob">Date of Birth</label>
            <input
              type="date"
              id="dob"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
          />
          {errors.email && <div className="error-message">{errors.email}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Additional information about this card..."
            value={formData.notes}
            onChange={handleChange}
          />
        </div>
      </div>
      
      <div className="form-actions">
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : submitButtonText}
        </button>
      </div>
    </form>
  );
} 