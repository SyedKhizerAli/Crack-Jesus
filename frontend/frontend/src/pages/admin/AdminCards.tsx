import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './AdminCards.css';

interface Card {
  id: string;
  type: string;
  cardType: string;
  bin: string;
  holderName: string;
  expiryMonth: number;
  expiryYear: number;
  address: {
    country: string;
    state: string;
    city: string;
    zip: string;
  };
  bank: string;
  base: string;
  additionalInfo: string;
  note: string;
  price: number;
  status: string;
  createdAt: string;
  vendor: {
    id?: string;
    username: string;
    verified?: boolean;
  };
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

interface FilterOptions {
  status: string;
  type: string;
  cardType: string;
  bin: string;
  country: string;
  state: string;
  zip: string;
  city: string;
  seller: string;
  base: string;
  bank: string;
  expiryYear: string;
  search: string;
  minPrice: string;
  maxPrice: string;
  ordering: string;
}

export function AdminCards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterOptions>({
    status: '',
    type: '',
    cardType: '',
    bin: '',
    country: '',
    state: '',
    zip: '',
    city: '',
    seller: '',
    base: '',
    bank: '',
    expiryYear: '',
    search: '',
    minPrice: '',
    maxPrice: '',
    ordering: 'date_desc'
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    fetchCards();
  }, [page, filters.status, filters.type, filters.cardType, filters.bin, 
      filters.country, filters.state, filters.zip, filters.city, 
      filters.seller, filters.base, filters.bank, filters.expiryYear, 
      filters.minPrice, filters.maxPrice, filters.ordering]);

  const fetchCards = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Build query params
      const params: any = { page, limit: 10 };
      if (filters.status) {
        params.status = filters.status;
      }
      if (filters.type) {
        params.type = filters.type;
      }
      if (filters.cardType) {
        params.cardType = filters.cardType;
      }
      if (filters.bin) {
        params.bin = filters.bin;
      }
      if (filters.country) {
        params.country = filters.country;
      }
      if (filters.state) {
        params.state = filters.state;
      }
      if (filters.zip) {
        params.zip = filters.zip;
      }
      if (filters.city) {
        params.city = filters.city;
      }
      if (filters.seller) {
        params.seller = filters.seller;
      }
      if (filters.base) {
        params.base = filters.base;
      }
      if (filters.bank) {
        params.bank = filters.bank;
      }
      if (filters.expiryYear) {
        params.expiryYear = filters.expiryYear;
      }
      if (filters.search) {
        params.search = filters.search;
      }
      if (filters.minPrice) {
        params.minPrice = filters.minPrice;
      }
      if (filters.maxPrice) {
        params.maxPrice = filters.maxPrice;
      }
      if (filters.ordering) {
        params.ordering = filters.ordering;
      }
      
      console.log('Fetching cards with params:', params);
      const response = await axios.get('http://localhost:3000/api/admin/cards', { 
        headers,
        params
      });
      
      console.log('Cards API response:', response.data);
      
      if (response.data && response.data.data) {
        if (response.data.data.cards && Array.isArray(response.data.data.cards)) {
          // Transform the card data to match our interface
          const transformedCards = response.data.data.cards.map((card: any) => ({
            id: card._id || card.id,
            type: card.cardDetails?.type || card.type || 'Unknown',
            cardType: card.cardType || card.cardDetails?.cardType || 'credit',
            bin: card.bin || card.cardDetails?.bin || '',
            holderName: card.holderName || card.cardDetails?.holderName || '',
            expiryMonth: card.expiryMonth || card.cardDetails?.expiryMonth || 0,
            expiryYear: card.expiryYear || card.cardDetails?.expiryYear || 0,
            address: card.address || {
              country: '',
              state: '',
              city: '',
              zip: ''
            },
            bank: card.bank || 'Unknown',
            base: card.base || 'Standard',
            additionalInfo: card.additionalInfo || '',
            note: card.note || '',
            price: card.price || 0,
            status: card.status || 'available',
            createdAt: card.createdAt || new Date().toISOString(),
            vendor: {
              id: card.vendor?.id || (typeof card.vendorId === 'object' ? card.vendorId._id : card.vendorId),
              username: card.vendor?.username || (typeof card.vendorId === 'object' ? card.vendorId.username : 'Unknown Vendor'),
              verified: card.vendor?.verified || (typeof card.vendorId === 'object' ? card.vendorId.btcPayStore?.verified : false)
            }
          }));
          
          setCards(transformedCards);
          setPagination(response.data.data.pagination || {
            currentPage: Number(page),
            totalPages: Math.ceil(transformedCards.length / 10),
            totalItems: transformedCards.length
          });
        } else {
          console.error('Unexpected cards structure:', response.data);
          setError('Unexpected response format from server');
        }
      } else {
        console.error('Invalid response:', response.data);
        setError('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Error fetching cards:', err);
      setError('Failed to load cards: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCards();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      type: '',
      cardType: '',
      bin: '',
      country: '',
      state: '',
      zip: '',
      city: '',
      seller: '',
      base: '',
      bank: '',
      expiryYear: '',
      search: '',
      minPrice: '',
      maxPrice: '',
      ordering: 'date_desc'
    });
    setPage(1);
  };

  const toggleAdvancedFilters = () => {
    setShowAdvancedFilters(!showAdvancedFilters);
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Manage Cards</h1>
        <div className="header-actions">
          <Link to="/admin/cards/add" className="btn btn-primary">Add New Card</Link>
        </div>
      </header>

      <div className="admin-content">
        {error && <div className="error-message">{error}</div>}

        <div className="filters-bar">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search by card number, holder name, or notes"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
            />
            <button type="submit" className="btn">Search</button>
          </form>
          
          <div className="filter-group">
            <label htmlFor="status-filter">Status:</label>
            <select 
              id="status-filter"
              name="status"
              value={filters.status} 
              onChange={handleFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
              <option value="pending">Pending</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="type-filter">Type:</label>
            <select 
              id="type-filter"
              name="type"
              value={filters.type} 
              onChange={handleFilterChange}
            >
              <option value="">All Types</option>
              <option value="Visa">Visa</option>
              <option value="Mastercard">Mastercard</option>
              <option value="Amex">American Express</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="card-category">Category:</label>
            <select 
              id="card-category" 
              name="cardType"
              value={filters.cardType} 
              onChange={handleFilterChange}
            >
              <option value="">All Categories</option>
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
              <option value="charge">Charge</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="ordering">Ordering:</label>
            <select 
              id="ordering" 
              name="ordering"
              value={filters.ordering} 
              onChange={handleFilterChange}
            >
              <option value="date_desc">Date (Newest)</option>
              <option value="date_asc">Date (Oldest)</option>
              <option value="price_asc">Price (Low to High)</option>
              <option value="price_desc">Price (High to Low)</option>
            </select>
          </div>

          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={toggleAdvancedFilters}
          >
            {showAdvancedFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="advanced-filters">
            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor="bin-filter">BIN:</label>
                <input
                  type="text"
                  id="bin-filter"
                  name="bin"
                  value={filters.bin}
                  onChange={handleFilterChange}
                  placeholder="Enter BIN number"
                />
              </div>

              <div className="filter-group">
                <label htmlFor="country-filter">Country:</label>
                <input
                  type="text"
                  id="country-filter"
                  name="country"
                  value={filters.country} 
                  onChange={handleFilterChange}
                  placeholder="Enter country"
                />
              </div>

              <div className="filter-group">
                <label htmlFor="state-filter">State:</label>
                <input
                  type="text"
                  id="state-filter"
                  name="state"
                  value={filters.state}
                  onChange={handleFilterChange}
                  placeholder="Enter state"
                />
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor="city-filter">City:</label>
                <input
                  type="text"
                  id="city-filter"
                  name="city"
                  value={filters.city}
                  onChange={handleFilterChange}
                  placeholder="Enter city"
                />
              </div>

              <div className="filter-group">
                <label htmlFor="zip-filter">Zip:</label>
                <input
                  type="text"
                  id="zip-filter"
                  name="zip"
                  value={filters.zip}
                  onChange={handleFilterChange}
                  placeholder="Enter zip code"
                />
              </div>

              <div className="filter-group">
                <label htmlFor="seller-filter">Seller:</label>
                <input
                  type="text"
                  id="seller-filter"
                  name="seller"
                  value={filters.seller}
                  onChange={handleFilterChange}
                  placeholder="Enter seller name"
                />
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor="base-filter">Base:</label>
                <input
                  type="text"
                  id="base-filter"
                  name="base"
                  value={filters.base}
                  onChange={handleFilterChange}
                  placeholder="Enter base"
                />
              </div>

              <div className="filter-group">
                <label htmlFor="bank-filter">Bank:</label>
                <input
                  type="text"
                  id="bank-filter"
                  name="bank"
                  value={filters.bank}
                  onChange={handleFilterChange}
                  placeholder="Enter bank name"
                />
              </div>

              <div className="filter-group">
                <label htmlFor="expiry-year-filter">Expiry Year:</label>
                <select 
                  id="expiry-year-filter"
                  name="expiryYear"
                  value={filters.expiryYear} 
                  onChange={handleFilterChange}
                >
                  <option value="">All Years</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                </select>
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor="min-price">Min Price ($):</label>
                <input
                  type="number"
                  id="min-price"
                  name="minPrice"
                  value={filters.minPrice}
                  onChange={handleFilterChange}
                  placeholder="Min"
                  min="0"
                />
              </div>

              <div className="filter-group">
                <label htmlFor="max-price">Max Price ($):</label>
                <input
                  type="number"
                  id="max-price"
                  name="maxPrice"
                  value={filters.maxPrice}
                  onChange={handleFilterChange}
                  placeholder="Max"
                  min="0"
                />
              </div>

              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={clearFilters}
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="loading">Loading cards...</div>
        ) : cards.length > 0 ? (
          <div className="cards-table-container">
            <table className="cards-table">
              <thead>
                <tr>
                  <th>BIN</th>
                  <th>Type</th>
                  <th>Exp</th>
                  <th>Holder</th>
                  <th>Address</th>
                  <th>Additional Info</th>
                  <th>Note</th>
                  <th>Base</th>
                  <th>Seller</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
            {cards.map((card) => (
                  <tr key={card.id}>
                    <td>{card.bin}</td>
                    <td>{card.type} ({card.cardType})</td>
                    <td>{card.expiryMonth.toString().padStart(2, '0')}/{card.expiryYear}</td>
                    <td>{card.holderName}</td>
                    <td>
                      {card.address.city && `${card.address.city}, `}
                      {card.address.state && `${card.address.state}, `}
                      {card.address.country}
                      {card.address.zip && ` ${card.address.zip}`}
                    </td>
                    <td>{card.additionalInfo}</td>
                    <td>{card.note}</td>
                    <td>{card.base}</td>
                    <td>
                      {card.vendor.username}
                      {card.vendor.verified && <span className="verified-badge">✓</span>}
                    </td>
                    <td>${card.price.toFixed(2)}</td>
                    <td>
                  <span className={`status-badge status-${card.status.toLowerCase()}`}>
                    {card.status}
                  </span>
                    </td>
                    <td>
                      <Link to={`/admin/cards/${card.id}`} className="btn btn-sm">View</Link>
                  {card.status === 'pending' && (
                    <div className="approval-actions">
                      <button className="btn btn-sm btn-success">Approve</button>
                      <button className="btn btn-sm btn-danger">Reject</button>
                    </div>
                  )}
                  {card.status === 'available' && (
                    <button className="btn btn-sm btn-warning">Hide</button>
                  )}
                  {card.status === 'hidden' && (
                    <button className="btn btn-sm btn-success">Unhide</button>
                  )}
                    </td>
                  </tr>
            ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">💳</div>
            <h3>No Cards Found</h3>
            <p className="empty-state-message">No cards match your search criteria.</p>
            {(filters.status || filters.type || filters.cardType || filters.bin || 
              filters.country || filters.state || filters.zip || filters.city || 
              filters.seller || filters.base || filters.bank || filters.expiryYear || 
              filters.search || filters.minPrice || filters.maxPrice) && (
              <button 
                className="btn" 
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button 
              onClick={() => handlePageChange(page - 1)} 
              disabled={page === 1}
            >
              Previous
            </button>
            
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={pageNum === page ? 'active' : ''}
              >
                {pageNum}
              </button>
            ))}
            
            <button 
              onClick={() => handlePageChange(page + 1)} 
              disabled={page === pagination.totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 