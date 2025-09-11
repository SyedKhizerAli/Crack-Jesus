const axios = require('axios');

class CardVerificationService {
  constructor() {
    // Use mirror1 as default, fallback to mirror2
    this.baseUrl = process.env.CARD_CHECKER_PRIMARY_URL || 'https://mirror1.luxchecker.vc';
    this.fallbackUrl = process.env.CARD_CHECKER_FALLBACK_URL || 'https://mirror2.luxchecker.vc';
    this.username = process.env.CARD_CHECKER_USERNAME;
    this.apiKey = process.env.CARD_CHECKER_API_KEY;
  }

  async verifyCard(cardData) {
    try {
      return await this._makeRequest('/apiv2/ck.php', {
        cardnum: cardData.number,
        expm: cardData.expiryMonth,
        expy: cardData.expiryYear,
        cvv: cardData.cvv
      });
    } catch (error) {
      console.error('Card Verification Error:', error);
      throw error;
    }
  }

  async check3DS(cardData) {
    try {
      return await this._makeRequest('/apiv2/3d.php', {
        cardnum: cardData.number
      });
    } catch (error) {
      console.error('3DS Check Error:', error);
      throw error;
    }
  }

  async checkBalance(cardData) {
    try {
      return await this._makeRequest('/apiv2/bk.php', {
        cardnum: cardData.number,
        expm: cardData.expiryMonth,
        expy: cardData.expiryYear,
        cvv: cardData.cvv,
        amount: Math.min(cardData.amount, 10000) // Max amount is 10000
      });
    } catch (error) {
      console.error('Balance Check Error:', error);
      throw error;
    }
  }

  async checkAVS(cardData) {
    try {
      return await this._makeRequest('/apiv2/avk.php', {
        cardnum: cardData.number,
        expm: cardData.expiryMonth,
        expy: cardData.expiryYear,
        cvv: cardData.cvv,
        fname: cardData.firstName,
        lname: cardData.lastName,
        address: cardData.address,
        city: cardData.city,
        state: cardData.state,
        zip: cardData.zip,
        country: cardData.country
      });
    } catch (error) {
      console.error('AVS Check Error:', error);
      throw error;
    }
  }

  async _makeRequest(endpoint, params) {
    // Add common parameters
    const requestParams = {
      ...params,
      username: this.username,
      key: this.apiKey,
      type: 'JSON'
    };

    try {
      // Try primary URL
      const response = await axios.post(`${this.baseUrl}${endpoint}`, null, {
        params: requestParams,
        timeout: 10000 // 10 second timeout
      });
      
      return this._processResponse(response.data);
    } catch (error) {
      console.log(`Primary URL failed, trying fallback: ${error.message}`);
      
      try {
        // Try fallback URL
        const response = await axios.post(`${this.fallbackUrl}${endpoint}`, null, {
          params: requestParams,
          timeout: 10000
        });
        
        return this._processResponse(response.data);
      } catch (fallbackError) {
        throw new Error(`Card verification failed: ${fallbackError.message}`);
      }
    }
  }

  _processResponse(data) {
    // Check for API errors
    if (data.error) {
      throw new Error(data.error);
    }
    
    return {
      success: data.result === 1,
      approved: data.result === 1,
      message: data.auth_message || 'No message provided',
      authCode: data.auth_code,
      cvvResponse: data.cvv_response,
      creditsRemaining: data.credits,
      is3dsEnabled: data.hasOwnProperty('3ds_response') ? data['3ds_response'] !== 'Disabled' : null,
      avsStreetMatch: data.add_response === 1,
      avsPostalMatch: data.postal_response === 1,
      rawResponse: data
    };
  }
}

module.exports = new CardVerificationService(); 