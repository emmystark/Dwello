import { useState } from 'react'

interface LocationSelectorProps {
  onLocationSelect: (location: any) => void
  selectedLocation: any
}

const countries = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'France', 'Spain', 'Italy', 'Netherlands', 'Switzerland', 'Sweden',
  'Norway', 'Denmark', 'Japan', 'South Korea', 'Singapore', 'Hong Kong',
  'United Arab Emirates', 'Saudi Arabia', 'Nigeria', 'South Africa', 'Kenya',
  'Ghana', 'Egypt', 'Brazil', 'Mexico', 'Argentina', 'Chile', 'India',
  'China', 'Thailand', 'Indonesia', 'Malaysia', 'Philippines', 'New Zealand'
]

const statesByCountry: { [key: string]: string[] } = {
  'United States': [
    'California', 'Texas', 'Florida', 'New York', 'Illinois', 'Pennsylvania',
    'Ohio', 'Georgia', 'North Carolina', 'Michigan', 'Washington', 'Arizona'
  ],
  'United Kingdom': ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  'Canada': ['Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba'],
  'Nigeria': ['Lagos', 'Abuja (FCT)', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 'Edo'],
  'Australia': ['New South Wales', 'Victoria', 'Queensland', 'Western Australia'],
  'Germany': ['Bavaria', 'Berlin', 'Hamburg', 'Hesse', 'North Rhine-Westphalia'],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'],
  'France': ['Île-de-France', 'Provence-Alpes-Côte d\'Azur', 'Auvergne-Rhône-Alpes'],
  'India': ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Gujarat'],
  'Brazil': ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia'],
}

const citiesByState: { [key: string]: string[] } = {
  'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento'],
  'Texas': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse'],
  'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale'],
  'England': ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds', 'Bristol'],
  'Scotland': ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee'],
  'Ontario': ['Toronto', 'Ottawa', 'Mississauga', 'Hamilton', 'London'],
  'British Columbia': ['Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond'],
  'Lagos': ['Ikeja', 'Victoria Island', 'Lekki', 'Ikoyi', 'Surulere', 'Yaba'],
  'Abuja (FCT)': ['Central Area', 'Garki', 'Wuse', 'Maitama', 'Asokoro', 'Gwarinpa'],
  'Dubai': ['Downtown Dubai', 'Dubai Marina', 'Jumeirah', 'Business Bay', 'JBR'],
  'Abu Dhabi': ['Abu Dhabi City', 'Al Ain', 'Khalifa City', 'Yas Island'],
  'New South Wales': ['Sydney', 'Newcastle', 'Wollongong', 'Central Coast'],
  'Victoria': ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo'],
  'Bavaria': ['Munich', 'Nuremberg', 'Augsburg', 'Regensburg'],
  'Berlin': ['Mitte', 'Charlottenburg', 'Kreuzberg', 'Friedrichshain'],
}

const LocationSelector = ({ onLocationSelect, selectedLocation }: LocationSelectorProps) => {
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const [availableStates, setAvailableStates] = useState<string[]>([])
  const [availableCities, setAvailableCities] = useState<string[]>([])

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value
    setSelectedCountry(country)
    setSelectedState('')
    
    const states = statesByCountry[country] || []
    setAvailableStates(states)
    setAvailableCities([])

    onLocationSelect({ country, state: '', city: '' })
  }

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const state = e.target.value
    setSelectedState(state)
    
    const cities = citiesByState[state] || []
    setAvailableCities(cities)

    onLocationSelect({ country: selectedCountry, state, city: '' })
  }

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const city = e.target.value
    onLocationSelect({ country: selectedCountry, state: selectedState, city })
  }

  return (
    <div className="location-selector">
      <div className="selector-header">
        <h2>Search Properties Worldwide</h2>
        <p className="subtitle">Select your desired location to find blockchain-verified properties</p>
      </div>
      
      <div className="selector-grid">
        <div className="selector-card">
          <label>Country</label>
          <select value={selectedCountry} onChange={handleCountryChange}>
            <option value="">Select Country</option>
            {countries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>

        {selectedCountry && availableStates.length > 0 && (
          <div className="selector-card fade-in">
            <label>State / Region</label>
            <select value={selectedState} onChange={handleStateChange}>
              <option value="">Select State/Region</option>
              {availableStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
        )}

        {selectedState && availableCities.length > 0 && (
          <div className="selector-card fade-in">
            <label>City / Area</label>
            <select value={selectedLocation.city || ''} onChange={handleCityChange}>
              <option value="">Select City/Area</option>
              {availableCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {(selectedCountry || selectedState || selectedLocation.city) && (
        <div className="map-placeholders fade-in">
          {selectedCountry && (
            <div className="map-placeholder">
              <div className="map-icon"></div>
              <p>{selectedCountry}</p>
            </div>
          )}
          {selectedState && (
            <div className="map-placeholder">
              <div className="map-icon"></div>
              <p>{selectedState}</p>
            </div>
          )}
          {selectedLocation.city && (
            <div className="map-placeholder">
              <div className="map-icon"></div>
              <p>{selectedLocation.city}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LocationSelector
