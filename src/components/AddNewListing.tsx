import { useState } from 'react'

interface Property {
  id: string
  houseName: string
  address: string
  apartments: Apartment[]
  totalEarnings: number
  images: string[]
  pricing: string
}

interface Apartment {
  id: string
  number: number
  tenant: string | null
  possessionDate: string
  expiryDate: string
  pricing: string
  status: 'occupied' | 'vacant'
}

interface AddNewListingProps {
  onAddProperty: (property: Property) => void
}

const AddNewListing = ({ onAddProperty }: AddNewListingProps) => {
  const [formData, setFormData] = useState({
    houseName: '',
    address: '',
    pricing: '',
    numberOfApartments: 1
  })

  const [apartments, setApartments] = useState<Partial<Apartment>[]>([
    { number: 1, tenant: null, status: 'vacant', pricing: '' }
  ])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleApartmentCountChange = (count: number) => {
    const newApartments: Partial<Apartment>[] = []
    for (let i = 0; i < count; i++) {
      newApartments.push(
        apartments[i] || { 
          number: i + 1, 
          tenant: null, 
          status: 'vacant', 
          pricing: formData.pricing 
        }
      )
    }
    setApartments(newApartments)
    setFormData(prev => ({ ...prev, numberOfApartments: count }))
  }

  const updateApartment = (index: number, field: string, value: any) => {
    const newApartments = [...apartments]
    newApartments[index] = { ...newApartments[index], [field]: value }
    setApartments(newApartments)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const newProperty: Property = {
      id: `prop_${Date.now()}`,
      houseName: formData.houseName,
      address: formData.address,
      pricing: formData.pricing,
      apartments: apartments.map((apt, idx) => ({
        id: `apt_${Date.now()}_${idx}`,
        number: apt.number || idx + 1,
        tenant: apt.tenant || null,
        possessionDate: apt.possessionDate || '',
        expiryDate: apt.expiryDate || '',
        pricing: apt.pricing || formData.pricing,
        status: apt.status || 'vacant'
      })),
      totalEarnings: 0,
      images: []
    }

    onAddProperty(newProperty)
    
    // Reset form
    setFormData({
      houseName: '',
      address: '',
      pricing: '',
      numberOfApartments: 1
    })
    setApartments([{ number: 1, tenant: null, status: 'vacant', pricing: '' }])
  }

  return (
    <div className="add-new-listing">
      <div className="form-container">
        <div className="form-header">
          <h2>Add New Property</h2>
          <p>Fill in the details to list your property on the blockchain</p>
        </div>

        <form onSubmit={handleSubmit} className="listing-form">
          <div className="form-section">
            <h3>Property Information</h3>
            
            <div className="form-group">
              <label>House Name *</label>
              <input
                type="text"
                name="houseName"
                value={formData.houseName}
                onChange={handleInputChange}
                placeholder="e.g., Afasa Lounges"
                required
              />
            </div>

            <div className="form-group">
              <label>Address *</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="e.g., No 15 Ogbowodeci"
                required
              />
            </div>

            <div className="form-group">
              <label>Default Pricing (per year) *</label>
              <input
                type="text"
                name="pricing"
                value={formData.pricing}
                onChange={handleInputChange}
                placeholder="e.g., $25,000"
                required
              />
            </div>

            <div className="form-group">
              <label>Number of Apartments *</label>
              <div className="number-selector">
                <button
                  type="button"
                  onClick={() => handleApartmentCountChange(Math.max(1, formData.numberOfApartments - 1))}
                  className="btn-decrease"
                >
                  -
                </button>
                <span className="number-display">{formData.numberOfApartments}</span>
                <button
                  type="button"
                  onClick={() => handleApartmentCountChange(formData.numberOfApartments + 1)}
                  className="btn-increase"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Upload Images & Videos</h3>
            <div className="upload-area">
              <div className="upload-icon">📸</div>
              <p>Click to upload or drag and drop</p>
              <small>PNG, JPG, MP4 up to 10MB</small>
              <input type="file" multiple accept="image/*,video/*" style={{ display: 'none' }} />
            </div>
          </div>

          <div className="form-section">
            <h3>Apartments Details</h3>
            <div className="apartments-list">
              {apartments.map((apt, index) => (
                <div key={index} className="apartment-item">
                  <div className="apartment-header">
                    <h4>Apartment {index + 1}</h4>
                    <button
                      type="button"
                      className="status-toggle"
                      onClick={() => updateApartment(
                        index, 
                        'status', 
                        apt.status === 'vacant' ? 'occupied' : 'vacant'
                      )}
                    >
                      {apt.status === 'vacant' ? '🏚️ Vacant' : '✅ Occupied'}
                    </button>
                  </div>

                  <div className="apartment-fields">
                    {apt.status === 'occupied' && (
                      <>
                        <input
                          type="text"
                          placeholder="Tenant Name"
                          value={apt.tenant || ''}
                          onChange={(e) => updateApartment(index, 'tenant', e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Possession Date"
                          value={apt.possessionDate || ''}
                          onChange={(e) => updateApartment(index, 'possessionDate', e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Expiry Date"
                          value={apt.expiryDate || ''}
                          onChange={(e) => updateApartment(index, 'expiryDate', e.target.value)}
                        />
                      </>
                    )}
                    <input
                      type="text"
                      placeholder="Pricing (optional)"
                      value={apt.pricing || ''}
                      onChange={(e) => updateApartment(index, 'pricing', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              <span>🔗</span>
              <span>Add to Blockchain</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddNewListing