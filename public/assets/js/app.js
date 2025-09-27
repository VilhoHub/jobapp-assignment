// utility functions
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function isoToDdMmYyyy(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function centsToMoney(n) {
  return (n / 100).toFixed(2);
}

function daysBetween(aIso, bIso) {
  const ms = (new Date(bIso)) - (new Date(aIso));
  return Math.max(0, Math.round(ms / 86400000));
}

// dynamic guest list management
let guestCount = 0;

function addGuest(age = '') {
  guestCount++;
  const guestsList = $('#guestsList');
  
  const guestItem = document.createElement('div');
  guestItem.className = 'guest-item';
  guestItem.dataset.guestId = guestCount;
  
  guestItem.innerHTML = `
    <span class="guest-number">Guest ${guestCount}</span>
    <input 
      type="number" 
      class="guest-age-input" 
      placeholder="Age" 
      min="0" 
      max="120" 
      value="${age}"
      data-guest-id="${guestCount}"
    />
    <button type="button" class="btn-remove-guest" onclick="removeGuest(${guestCount})">
      Remove
    </button>
  `;
  
  guestsList.appendChild(guestItem);
  updateGuestNumbers();
}

function removeGuest(guestId) {
  const guestItem = document.querySelector(`[data-guest-id="${guestId}"]`);
  if (guestItem) {
    guestItem.remove();
    updateGuestNumbers();
  }
}

function updateGuestNumbers() {
  const guestItems = $$('.guest-item');
  guestItems.forEach((item, index) => {
    const numberSpan = item.querySelector('.guest-number');
    numberSpan.textContent = `Guest ${index + 1}`;
  });
}

function getGuestAges() {
  const ageInputs = $$('.guest-age-input');
  return Array.from(ageInputs)
    .map(input => parseInt(input.value))
    .filter(age => !isNaN(age) && age >= 0);
}

// form validation
function validateInputs() {
  const errors = [];
  
  const unitName = $('#unitName').value.trim();
  const arrivalIso = $('#arrival').value;
  const departureIso = $('#departure').value;
  const ages = getGuestAges();
  
  if (!unitName) {
    errors.push('Please select a unit');
  }
  
  if (!arrivalIso) {
    errors.push('Please select a check-in date');
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const arrival = new Date(arrivalIso);
    if (arrival < today) {
      errors.push('Check-in date cannot be in the past');
    }
  }
  
  if (!departureIso) {
    errors.push('Please select a check-out date');
  } else if (arrivalIso) {
    const arrival = new Date(arrivalIso);
    const departure = new Date(departureIso);
    if (departure <= arrival) {
      errors.push('Check-out date must be after check-in date');
    }

  }
  
  if (ages.length === 0) {
    errors.push('Please add at least one guest');
  }
  
  const ageInputs = $$('.guest-age-input');
  let hasInvalidAge = false;
  ageInputs.forEach(input => {
    const age = parseInt(input.value);
    if (input.value && (isNaN(age) || age < 0 || age > 120)) {
      hasInvalidAge = true;
    }
  });
  
  if (hasInvalidAge) {
    errors.push('Please enter valid ages (0-120) for all guests');
  }
  
  return errors;
}

// prevent past dates and invalid ranges
function setDateConstraints() {
  const today = new Date().toISOString().split('T')[0];
  const arrivalInput = $('#arrival');
  const departureInput = $('#departure');
  
  arrivalInput.min = today;
  departureInput.min = today;
  
  arrivalInput.addEventListener('change', function() {
    const arrivalDate = this.value;
    if (arrivalDate) {
      const nextDay = new Date(arrivalDate);
      nextDay.setDate(nextDay.getDate() + 1);
      departureInput.min = nextDay.toISOString().split('T')[0];
      
      if (departureInput.value && departureInput.value <= arrivalDate) {
        departureInput.value = '';
      }
    }
  });
}

// loading states
function setLoadingState(isLoading) {
  const button = $('#searchRates');
  const msgEl = $('#message');
  
  if (isLoading) {
    button.disabled = true;
    button.classList.add('loading');
    showMessage('Searching for the best rates...', 'loading');
  } else {
    button.disabled = false;
    button.classList.remove('loading');
  }
}

function showMessage(text, type = 'info') {
  const msgEl = $('#message');
  msgEl.textContent = text;
  msgEl.className = `message show ${type}`;
}

function hideMessage() {
  const msgEl = $('#message');
  msgEl.className = 'message';
}

// main api call to backend
async function searchRates() {
  const resultsEl = $('#results');
  
  const validationErrors = validateInputs();
  if (validationErrors.length > 0) {
    const msgEl = $('#message');
    msgEl.innerHTML = validationErrors.map(err => `• ${err}`).join('<br>');
    msgEl.className = 'message show error';
    return;
  }
  
  // Set loading state
  setLoadingState(true);
  resultsEl.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Searching for rates...</p></div>';

  const unitName = $('#unitName').value.trim();
  const arrivalIso = $('#arrival').value;
  const departureIso = $('#departure').value;
  const ages = getGuestAges();
  const occupants = ages.length;

  const payload = {
    "Unit Name": unitName,
    "Arrival": isoToDdMmYyyy(arrivalIso),
    "Departure": isoToDdMmYyyy(departureIso),
    "Occupants": occupants,
    "Ages": ages
  };

  try {
    const res = await fetch(API_CONFIG.ratesEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      showMessage(data.message || 'Something went wrong. Please try again.', 'error');
      
      if (data.technical_details && API_CONFIG.debug) {
        console.error('API Error Details:', data.technical_details);
      }
      
      resultsEl.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><p>Unable to find rates. Please try again.</p></div>';
    } else {
      showMessage('Rates found successfully!', 'success');
      renderResults(data);
    }
    
  } catch (err) {
    let errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
    
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      errorMessage = 'Network connection failed. Please check your internet connection.';
    } else if (err.name === 'SyntaxError') {
      errorMessage = 'Received invalid response from server. Please try again.';
    }
    
    showMessage(errorMessage, 'error');
    resultsEl.innerHTML = '<div class="empty-state"><div class="empty-icon">🔌</div><p>Connection failed. Please try again.</p></div>';
    
    if (API_CONFIG.debug) {
      console.error('Network Error:', err);
    }
  } finally {
    setLoadingState(false);
  }
}

// format and display rate results
function renderResults(data) {
  const resultsEl = $('#results');

  if (!data || !data.remote) {
    resultsEl.innerHTML = `
      <div class="rate-summary">
        <h4>Raw Response</h4>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </div>
    `;
    return;
  }
  
  const r = data.remote;
  const nights = daysBetween(data.arrival, data.departure);
  const available = (r.Rooms ?? 0) > 0 && (Array.isArray(r.Legs) ? r.Legs.every(l => (l["Error Code"] ?? 0) === 0) : true);

  const totalCents = Number(r["Total Charge"] ?? 0);
  let nightlyCents = 0;
  if (Array.isArray(r.Legs) && r.Legs.length) {
    nightlyCents = Math.round(
      r.Legs.reduce((sum, l) => sum + Number(l["Effective Average Daily Rate"] || 0), 0) / r.Legs.length
    );
  }

  const summaryHtml = `
    <div class="rate-summary">
      <h4>${data.unitName}</h4>
      <div class="rate-detail">
        <span>Dates:</span>
        <strong>${data.arrival} → ${data.departure}</strong>
      </div>
      <div class="rate-detail">
        <span>Duration:</span>
        <strong>${nights} night${nights !== 1 ? 's' : ''}</strong>
      </div>
      <div class="rate-detail">
        <span>Guests:</span>
        <strong>${getGuestAges().length} guest${getGuestAges().length !== 1 ? 's' : ''}</strong>
      </div>
      <div class="rate-detail">
        <span>Availability:</span>
        <strong style="color: ${available ? '#2f855a' : '#c53030'}">${available ? 'Available' : 'Not available'}</strong>
      </div>
      <div class="rate-detail">
        <span>Rooms:</span>
        <strong>${r.Rooms ?? 'n/a'}</strong>
      </div>
      <div class="rate-detail">
        <span>Total Cost:</span>
        <strong style="color: #667eea; font-size: 1.2em;">$${centsToMoney(totalCents)}</strong>
      </div>
      ${nightlyCents ? `
      <div class="rate-detail">
        <span>Avg per night:</span>
        <strong>$${centsToMoney(nightlyCents)}</strong>
      </div>
      ` : ''}
    </div>
    <details style="margin-top: 1rem;">
      <summary style="cursor: pointer; font-weight: 500; color: #667eea;">View Raw Response</summary>
      <pre style="margin-top: 1rem; background: #f7fafc; padding: 1rem; border-radius: 8px; overflow: auto; font-size: 0.8rem;">${JSON.stringify(r, null, 2)}</pre>
    </details>
  `;

  resultsEl.innerHTML = summaryHtml;
}

// setup event listeners and initial state
document.addEventListener('DOMContentLoaded', function() {
  const searchButton = $('#searchRates');
  const addGuestButton = $('#addGuest');
  
  if (searchButton) {
    searchButton.addEventListener('click', searchRates);
  }
  
  if (addGuestButton) {
    addGuestButton.addEventListener('click', () => addGuest());
  }
  
  setDateConstraints();
  
  addGuest(40);
  addGuest(11);
  
  const formInputs = ['#unitName', '#arrival', '#departure'];
  formInputs.forEach(selector => {
    const field = $(selector);
    if (field) {
      field.addEventListener('change', hideMessage);
    }
  });
});

window.removeGuest = removeGuest;
