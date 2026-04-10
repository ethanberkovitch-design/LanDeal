// ===== STATE =====
const API = '';
let currentUser = null;
let currentPage = 'home';
let allListings = [];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token) {
    fetchUser(token);
  }
  loadListings();

  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 10);
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hideModal(overlay.id);
    });
  });
});

// ===== NAVIGATION =====
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) {
    target.classList.add('active');
    currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (page === 'landForApartment') renderApartmentListings();
    if (page === 'landForInvestment') loadPackages();
    if (page === 'profile') loadProfile();
    if (page === 'sellerSystem') loadMyPurchasedLands();
  }
  closeMobileMenu();
}

// ===== MOBILE MENU =====
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const overlay = document.getElementById('mobileOverlay');
  const isOpen = menu.classList.contains('active');

  if (isOpen) {
    closeMobileMenu();
  } else {
    menu.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileMenu() {
  document.getElementById('mobileMenu').classList.remove('active');
  document.getElementById('mobileOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// ===== MODALS =====
function showModal(id) {
  document.getElementById(id).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function hideModal(id) {
  document.getElementById(id).classList.remove('active');
  document.body.style.overflow = '';
}

// ===== AUTH =====
async function fetchUser(token) {
  try {
    const res = await fetch(API + '/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      currentUser = await res.json();
      updateAuthUI();
    } else {
      localStorage.removeItem('token');
    }
  } catch (e) {
    console.error('Auth check failed:', e);
  }
}

function updateAuthUI() {
  const mobileAuth = document.getElementById('mobileAuth');
  const mobileUserMenu = document.getElementById('mobileUserMenu');
  const mobileUserName = document.getElementById('mobileUserName');

  if (currentUser) {
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('registerBtn').style.display = 'none';
    document.getElementById('userMenu').style.display = 'flex';
    document.getElementById('userMenu').classList.remove('hidden');
    document.getElementById('userNameDisplay').textContent = currentUser.full_name;
    // Mobile
    mobileAuth.style.display = 'none';
    mobileUserMenu.style.display = 'flex';
    mobileUserMenu.classList.remove('hidden');
    mobileUserName.textContent = currentUser.full_name;
  } else {
    document.getElementById('loginBtn').style.display = '';
    document.getElementById('registerBtn').style.display = '';
    document.getElementById('userMenu').style.display = 'none';
    // Mobile
    mobileAuth.style.display = 'flex';
    mobileUserMenu.style.display = 'none';
  }
}

async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const alertEl = document.getElementById('loginAlert');

  if (!email || !password) {
    alertEl.innerHTML = '<div class="alert alert-error">נא למלא את כל השדות</div>';
    return;
  }

  try {
    const res = await fetch(API + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      currentUser = data.user;
      updateAuthUI();
      hideModal('loginModal');
      alertEl.innerHTML = '';
    } else {
      alertEl.innerHTML = `<div class="alert alert-error">${data.error}</div>`;
    }
  } catch (e) {
    alertEl.innerHTML = '<div class="alert alert-error">שגיאה בהתחברות</div>';
  }
}

async function register() {
  const full_name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const phone = document.getElementById('registerPhone').value;
  const password = document.getElementById('registerPassword').value;
  const user_type = document.getElementById('registerType').value;
  const alertEl = document.getElementById('registerAlert');

  if (!full_name || !email || !password) {
    alertEl.innerHTML = '<div class="alert alert-error">נא למלא את כל השדות הנדרשים</div>';
    return;
  }

  if (password.length < 6) {
    alertEl.innerHTML = '<div class="alert alert-error">הסיסמה חייבת להכיל לפחות 6 תווים</div>';
    return;
  }

  try {
    const res = await fetch(API + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email, phone, password, user_type })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      currentUser = data.user;
      updateAuthUI();
      hideModal('registerModal');
      alertEl.innerHTML = '';
    } else {
      alertEl.innerHTML = `<div class="alert alert-error">${data.error}</div>`;
    }
  } catch (e) {
    alertEl.innerHTML = '<div class="alert alert-error">שגיאה בהרשמה</div>';
  }
}

function logout() {
  localStorage.removeItem('token');
  currentUser = null;
  updateAuthUI();
  navigate('home');
}

function requireAuth(callback) {
  if (!currentUser) {
    showModal('loginModal');
    return false;
  }
  if (callback) callback();
  return true;
}

// ===== LISTINGS =====
async function loadListings() {
  try {
    const res = await fetch(API + '/api/listings');
    allListings = await res.json();
    populateLocationFilter();
  } catch (e) {
    console.error('Failed to load listings:', e);
  }
}

function populateLocationFilter() {
  const locations = [...new Set(allListings.filter(l => l.listing_type === 'apartment').map(l => l.location))];
  const select = document.getElementById('filterLocation');
  select.innerHTML = '<option value="">הכל</option>';
  locations.forEach(loc => {
    select.innerHTML += `<option value="${loc}">${loc}</option>`;
  });
}

function renderApartmentListings() {
  const container = document.getElementById('apartmentListings');
  const listings = getFilteredApartmentListings();

  if (listings.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:48px; color:var(--text-light); grid-column:1/-1;"><p style="font-size:48px; margin-bottom:16px;">&#128269;</p><p>לא נמצאו הצעות התואמות את החיפוש</p></div>';
    return;
  }

  const colors = ['#2ecc71', '#3498db', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];

  container.innerHTML = listings.map((l, i) => `
    <div class="card animate-in" style="animation-delay:${i * 0.1}s">
      <div class="card-image" style="background: linear-gradient(135deg, ${colors[i % colors.length]}, ${colors[(i + 1) % colors.length]});">
        <div class="card-image-placeholder">&#127968;</div>
        <div class="card-badge">${l.location}</div>
      </div>
      <div class="card-body">
        <div class="card-title">${l.title}</div>
        <div class="card-location">&#128205; ${l.location} ${l.project_name ? '| ' + l.project_name : ''}</div>
        <div class="card-details">
          <div class="card-detail">&#128208; ${l.apartment_size} מ"ר דירה</div>
          <div class="card-detail">&#128207; ${l.area_sqm} מ"ר קרקע</div>
          ${l.company_name ? `<div class="card-detail">&#127970; ${l.company_name}</div>` : ''}
        </div>
        <div class="card-price">${formatPrice(l.total_price)} <small>&#8362;</small></div>
        <div class="card-actions">
          <button class="btn btn-primary" onclick="showListingDetail(${l.id})">צפה בפרטים</button>
          <button class="btn btn-outline" onclick="orderListing(${l.id}, 'apartment')">הזמן</button>
        </div>
      </div>
    </div>
  `).join('');
}

function getFilteredApartmentListings() {
  let listings = allListings.filter(l => l.listing_type === 'apartment');
  const search = document.getElementById('filterSearch')?.value?.toLowerCase();
  const location = document.getElementById('filterLocation')?.value;
  const minPrice = document.getElementById('filterMinPrice')?.value;
  const maxPrice = document.getElementById('filterMaxPrice')?.value;

  if (search) {
    listings = listings.filter(l =>
      l.title.toLowerCase().includes(search) ||
      l.location.toLowerCase().includes(search) ||
      (l.project_name && l.project_name.toLowerCase().includes(search))
    );
  }
  if (location) listings = listings.filter(l => l.location === location);
  if (minPrice) listings = listings.filter(l => l.total_price >= Number(minPrice));
  if (maxPrice) listings = listings.filter(l => l.total_price <= Number(maxPrice));
  return listings;
}

function filterApartmentListings() {
  renderApartmentListings();
}

function showListingDetail(id) {
  const listing = allListings.find(l => l.id === id);
  if (!listing) return;

  document.getElementById('listingDetailTitle').textContent = listing.title;
  document.getElementById('listingDetailLocation').textContent = listing.location;

  const isApartment = listing.listing_type === 'apartment';
  document.getElementById('listingBreadcrumb').innerHTML = `
    <a onclick="navigate('home')">דף הבית</a>
    <span>&#8250;</span>
    <a onclick="navigate('buyerChoice')">רוכשי קרקע</a>
    <span>&#8250;</span>
    <a onclick="navigate('${isApartment ? 'landForApartment' : 'landForInvestment'}')">${isApartment ? 'קרקע לדירה' : 'קרקע כהשקעה'}</a>
    <span>&#8250;</span>
    <span>${listing.title}</span>
  `;

  document.getElementById('listingMap').innerHTML = `
    <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background: linear-gradient(135deg, #e8f5e9, #c8e6c9);">
      <div style="font-size:64px;">&#128205;</div>
      <div style="font-size:16px; color:var(--text-medium); margin-top:8px;">${listing.location}</div>
      ${listing.lat ? `<div style="font-size:12px; color:var(--text-light); margin-top:4px;">${listing.lat.toFixed(4)}, ${listing.lng.toFixed(4)}</div>` : ''}
    </div>
  `;

  document.getElementById('listingDetailInfo').innerHTML = `
    <h2 style="font-size:24px; font-weight:800; margin-bottom:16px;">${listing.title}</h2>
    <p style="color:var(--text-medium); line-height:1.8; margin-bottom:24px;">${listing.description}</p>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-item-label">מיקום</div>
        <div class="info-item-value">${listing.location}</div>
      </div>
      <div class="info-item">
        <div class="info-item-label">שטח קרקע</div>
        <div class="info-item-value">${listing.area_sqm} מ"ר</div>
      </div>
      ${isApartment ? `
        <div class="info-item">
          <div class="info-item-label">גודל דירה</div>
          <div class="info-item-value">${listing.apartment_size} מ"ר</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">פרויקט</div>
          <div class="info-item-value">${listing.project_name || '-'}</div>
        </div>
      ` : ''}
      <div class="info-item">
        <div class="info-item-label">מחיר למ"ר</div>
        <div class="info-item-value">${formatPrice(listing.price_per_sqm)} &#8362;</div>
      </div>
      ${listing.company_name ? `
        <div class="info-item">
          <div class="info-item-label">חברה משווקת</div>
          <div class="info-item-value">${listing.company_name}</div>
        </div>
      ` : ''}
    </div>
  `;

  document.getElementById('listingPriceCard').innerHTML = `
    <div class="price">${formatPrice(listing.total_price)} &#8362;</div>
    <div class="price-note">מחיר כולל | ${listing.price_per_sqm.toLocaleString()} &#8362; למ"ר</div>
    <div class="info-grid" style="text-align:right; margin:24px 0;">
      <div class="info-item">
        <div class="info-item-label">מקדמה (2.5%)</div>
        <div class="info-item-value">${formatPrice(listing.total_price * 0.025)} &#8362;</div>
      </div>
      <div class="info-item">
        <div class="info-item-label">סטטוס</div>
        <div class="info-item-value" style="color:var(--success);">&#9679; זמין</div>
      </div>
    </div>
    <button class="btn btn-primary btn-lg" style="width:100%; margin-bottom:12px;" onclick="orderListing(${listing.id}, '${listing.listing_type === 'apartment' ? 'apartment' : 'investment'}')">&#128230; הזמן עכשיו</button>
    <button class="btn btn-outline" style="width:100%;" onclick="navigate('contact')">&#128172; צור קשר לפרטים</button>
  `;

  navigate('listingDetail');
}

// ===== INVESTMENT PACKAGES =====
async function loadPackages() {
  try {
    const res = await fetch(API + '/api/listings/packages/all');
    const packages = await res.json();
    renderPackages(packages, 'packagesList');
  } catch (e) {
    console.error('Failed to load packages:', e);
  }
}

function renderPackages(packages, containerId) {
  const container = document.getElementById(containerId);
  if (!packages.length) {
    container.innerHTML = '<p style="text-align:center; color:var(--text-light); grid-column:1/-1;">אין חבילות זמינות כרגע</p>';
    return;
  }

  container.innerHTML = packages.map((pkg, i) => `
    <div class="package-card animate-in" style="animation-delay:${i * 0.15}s">
      <div class="package-header">
        <h3>${pkg.name}</h3>
        <div class="package-price">${formatPrice(pkg.total_price)} <small>&#8362;</small></div>
      </div>
      <div class="package-items">
        ${(pkg.items || []).map(item => `
          <div class="package-item" onclick="${item.listing_id ? `showListingDetail(${item.listing_id})` : ''}">
            <div class="package-item-dot"></div>
            <div class="package-item-info">
              <div class="package-item-title">${item.title || item.location}</div>
              <div class="package-item-detail">${item.area_sqm} מ"ר | ${item.location} ${item.price_per_sqm ? '| ' + formatPrice(item.price_per_sqm) + ' ₪/מ"ר' : ''}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="package-footer">
        ${pkg.id ? `<button class="btn btn-primary" style="width:100%;" onclick="orderPackage(${pkg.id})">&#128230; הזמן חבילה זו</button>` : `<button class="btn btn-accent" style="width:100%;" onclick="orderCustomPackage(${i})">&#128230; הזמן הצעה זו</button>`}
      </div>
    </div>
  `).join('');
}

function onConfirmRead() {
  const checked = document.getElementById('confirmRead').checked;
  const offers = document.getElementById('investmentOffers');
  if (checked) {
    offers.classList.remove('hidden');
    offers.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    offers.classList.add('hidden');
  }
}

async function getCustomPackages() {
  const budget = Number(document.getElementById('budgetInput').value);
  if (!budget || budget < 30000) {
    alert('נא להכניס סכום השקעה מינימלי של 30,000 ₪');
    return;
  }

  try {
    const res = await fetch(API + '/api/listings/packages/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget })
    });
    const packages = await res.json();
    if (Array.isArray(packages)) {
      document.getElementById('customPackages').classList.remove('hidden');
      renderPackages(packages, 'customPackagesList');
      document.getElementById('customPackages').scrollIntoView({ behavior: 'smooth' });
    }
  } catch (e) {
    alert('שגיאה בקבלת הצעות מותאמות');
  }
}

// ===== ORDERS =====
function orderListing(listingId, type) {
  if (!requireAuth()) return;
  const listing = allListings.find(l => l.id === listingId);
  if (!listing) return;

  const deposit = listing.total_price * 0.025;

  document.getElementById('orderModalBody').innerHTML = `
    <h3 style="margin-bottom:16px;">${listing.title}</h3>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-item-label">מיקום</div>
        <div class="info-item-value">${listing.location}</div>
      </div>
      <div class="info-item">
        <div class="info-item-label">שטח</div>
        <div class="info-item-value">${listing.area_sqm} מ"ר</div>
      </div>
      <div class="info-item">
        <div class="info-item-label">מחיר כולל</div>
        <div class="info-item-value">${formatPrice(listing.total_price)} &#8362;</div>
      </div>
      <div class="info-item">
        <div class="info-item-label">מקדמה (2.5%)</div>
        <div class="info-item-value" style="color:var(--accent-dark); font-weight:900;">${formatPrice(deposit)} &#8362;</div>
      </div>
    </div>
    <div class="alert alert-success" style="margin-top:16px;">
      לאחר אישור ההזמנה, החברה תכין את המסמכים הרלוונטיים באמצעות משרד עורכי הדין ותצור עמכם קשר לחתימה.
    </div>
  `;

  document.getElementById('confirmOrderBtn').onclick = () => submitOrder(listingId, null, type);
  showModal('orderModal');
}

function orderPackage(packageId) {
  if (!requireAuth()) return;

  fetch(API + '/api/listings/packages/all')
    .then(res => res.json())
    .then(packages => {
      const pkg = packages.find(p => p.id === packageId);
      if (!pkg) return;
      const deposit = pkg.total_price * 0.025;

      document.getElementById('orderModalBody').innerHTML = `
        <h3 style="margin-bottom:16px;">${pkg.name}</h3>
        <p style="color:var(--text-medium); margin-bottom:16px;">${pkg.description}</p>
        <div style="margin-bottom:16px;">
          ${pkg.items.map(item => `
            <div style="display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:1px solid var(--border);">
              <span style="color:var(--accent);">&#9679;</span>
              <span>${item.title || item.location} - ${item.area_sqm} מ"ר</span>
            </div>
          `).join('')}
        </div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-item-label">מחיר כולל</div>
            <div class="info-item-value">${formatPrice(pkg.total_price)} &#8362;</div>
          </div>
          <div class="info-item">
            <div class="info-item-label">מקדמה (2.5%)</div>
            <div class="info-item-value" style="color:var(--accent-dark); font-weight:900;">${formatPrice(deposit)} &#8362;</div>
          </div>
        </div>
        <div class="alert alert-success" style="margin-top:16px;">
          לאחר אישור ההזמנה, החברה תכין את המסמכים הרלוונטיים ותצור עמכם קשר.
        </div>
      `;

      document.getElementById('confirmOrderBtn').onclick = () => submitOrder(null, packageId, 'investment');
      showModal('orderModal');
    });
}

async function submitOrder(listingId, packageId, type) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(API + '/api/transactions/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        listing_id: listingId,
        package_id: packageId,
        transaction_type: type
      })
    });
    const data = await res.json();
    if (res.ok) {
      hideModal('orderModal');
      alert('ההזמנה נוצרה בהצלחה! מספר הזמנה: ' + data.id + '\nסכום מקדמה: ' + formatPrice(data.deposit_amount) + ' ₪\nניצור עמך קשר בהקדם.');
    } else {
      alert(data.error || 'שגיאה ביצירת ההזמנה');
    }
  } catch (e) {
    alert('שגיאה ביצירת ההזמנה');
  }
}

// ===== SELLERS =====
function handleSellerChoice(type) {
  if (type === 'private') {
    if (!requireAuth()) return;
    navigate('sellerPrivate');
  } else if (type === 'system') {
    if (!requireAuth()) return;
    navigate('sellerSystem');
  } else if (type === 'marketer') {
    if (!requireAuth()) return;
    navigate('sellerMarketer');
  }
}

function handleMarketerChoice(type) {
  if (type === 'apartment') {
    document.getElementById('marketerForm').classList.remove('hidden');
    document.getElementById('marketerMeeting').classList.add('hidden');
  } else {
    document.getElementById('marketerForm').classList.add('hidden');
    document.getElementById('marketerMeeting').classList.remove('hidden');
  }
}

async function submitSellerRequest(type) {
  const token = localStorage.getItem('token');
  let body = { seller_type: type };
  let alertEl;

  if (type === 'private') {
    alertEl = document.getElementById('sellerFormAlert');
    body.location = document.getElementById('sellerLocation').value;
    body.owner_name = document.getElementById('sellerOwnerName').value;
    body.total_area = Number(document.getElementById('sellerTotalArea').value);
    body.sale_area = Number(document.getElementById('sellerSaleArea').value);
    body.ownership_details = document.getElementById('sellerOwnership').value;

    if (!body.location || !body.owner_name) {
      alertEl.innerHTML = '<div class="alert alert-error">נא למלא מיקום ושם הבעלים</div>';
      return;
    }
  } else if (type === 'marketer') {
    alertEl = document.getElementById('marketerFormAlert');
    body.location = document.getElementById('marketerLocation').value;
    body.ownership_details = document.getElementById('marketerDesc').value;
    body.total_area = Number(document.getElementById('marketerArea').value);

    if (!body.location) {
      alertEl.innerHTML = '<div class="alert alert-error">נא למלא מיקום</div>';
      return;
    }
  }

  try {
    const res = await fetch(API + '/api/sellers/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      alertEl.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
    } else {
      alertEl.innerHTML = `<div class="alert alert-error">${data.error}</div>`;
    }
  } catch (e) {
    alertEl.innerHTML = '<div class="alert alert-error">שגיאה בשליחת הבקשה</div>';
  }
}

async function loadMyPurchasedLands() {
  const token = localStorage.getItem('token');
  const container = document.getElementById('myPurchasedLands');
  try {
    const res = await fetch(API + '/api/transactions/my', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const transactions = await res.json();

    if (!transactions.length) {
      container.innerHTML = `
        <div style="text-align:center; padding:64px 24px;">
          <div style="font-size:64px; margin-bottom:16px;">&#128230;</div>
          <h3 style="margin-bottom:8px;">אין רכישות עדיין</h3>
          <p style="color:var(--text-light); margin-bottom:24px;">לאחר שתרכשו קרקע דרך המערכת, היא תופיע כאן.</p>
          <button class="btn btn-primary" onclick="navigate('buyerChoice')">עברו לרכישת קרקע</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="cards-grid">
        ${transactions.map(t => `
          <div class="card">
            <div class="card-body">
              <div class="card-title">${t.listing_title || t.package_name || 'עסקה #' + t.id}</div>
              <div class="card-location">&#128205; ${t.listing_location || 'חבילת השקעה'}</div>
              <div class="card-details">
                <div class="card-detail">&#128176; ${formatPrice(t.total_amount)} &#8362;</div>
                <div class="card-detail">&#128197; ${new Date(t.created_at).toLocaleDateString('he-IL')}</div>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
                <span style="background:${t.status === 'pending' ? 'var(--warning)' : 'var(--success)'}; color:white; padding:4px 12px; border-radius:50px; font-size:13px;">${t.status === 'pending' ? 'ממתין' : 'הושלם'}</span>
                <button class="btn btn-outline btn-sm">העמד למכירה</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    container.innerHTML = '<div class="alert alert-error">שגיאה בטעינת הנתונים</div>';
  }
}

// ===== PROFILE =====
async function loadProfile() {
  if (!currentUser) {
    navigate('home');
    showModal('loginModal');
    return;
  }

  document.getElementById('profileAvatar').textContent = currentUser.full_name.charAt(0);
  document.getElementById('profileName').textContent = currentUser.full_name;
  document.getElementById('profileEmail').textContent = currentUser.email;
  showProfileTab('transactions');
}

async function showProfileTab(tab) {
  const container = document.getElementById('profileContent');
  const token = localStorage.getItem('token');

  document.querySelectorAll('.profile-menu li').forEach(li => li.classList.remove('active'));
  event.target.classList.add('active');

  if (tab === 'transactions') {
    try {
      const res = await fetch(API + '/api/transactions/my', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (!data.length) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-light);"><p style="font-size:48px;">&#128230;</p><p>אין עסקאות עדיין</p></div>';
        return;
      }
      container.innerHTML = `
        <h3 style="margin-bottom:20px;">העסקאות שלי</h3>
        ${data.map(t => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:16px; border:1px solid var(--border); border-radius:var(--radius-sm); margin-bottom:12px;">
            <div>
              <div style="font-weight:600;">${t.listing_title || t.package_name || 'עסקה #' + t.id}</div>
              <div style="font-size:13px; color:var(--text-light);">${new Date(t.created_at).toLocaleDateString('he-IL')} | ${t.transaction_type === 'apartment' ? 'קרקע לדירה' : 'השקעה מבוזרת'}</div>
            </div>
            <div style="text-align:left;">
              <div style="font-weight:700; color:var(--primary);">${formatPrice(t.total_amount)} &#8362;</div>
              <span style="background:${t.status === 'pending' ? 'var(--warning)' : 'var(--success)'}; color:white; padding:2px 10px; border-radius:50px; font-size:12px;">${t.status === 'pending' ? 'ממתין' : 'הושלם'}</span>
            </div>
          </div>
        `).join('')}
      `;
    } catch (e) {
      container.innerHTML = '<div class="alert alert-error">שגיאה בטעינת העסקאות</div>';
    }
  } else if (tab === 'listings') {
    try {
      const res = await fetch(API + '/api/sellers/my-listings', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (!data.length) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-light);"><p style="font-size:48px;">&#127968;</p><p>אין קרקעות רשומות</p></div>';
        return;
      }
      container.innerHTML = `
        <h3 style="margin-bottom:20px;">הקרקעות שלי</h3>
        ${data.map(l => `
          <div style="padding:16px; border:1px solid var(--border); border-radius:var(--radius-sm); margin-bottom:12px;">
            <div style="font-weight:600;">${l.title}</div>
            <div style="font-size:13px; color:var(--text-light);">${l.location} | ${l.area_sqm} מ"ר | ${formatPrice(l.total_price)} &#8362;</div>
          </div>
        `).join('')}
      `;
    } catch (e) {
      container.innerHTML = '<div class="alert alert-error">שגיאה בטעינת הקרקעות</div>';
    }
  } else if (tab === 'requests') {
    try {
      const res = await fetch(API + '/api/sellers/my-requests', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (!data.length) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-light);"><p style="font-size:48px;">&#128203;</p><p>אין בקשות</p></div>';
        return;
      }
      container.innerHTML = `
        <h3 style="margin-bottom:20px;">הבקשות שלי</h3>
        ${data.map(r => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:16px; border:1px solid var(--border); border-radius:var(--radius-sm); margin-bottom:12px;">
            <div>
              <div style="font-weight:600;">${r.seller_type === 'private' ? 'מכירת קרקע פרטית' : r.seller_type === 'marketer' ? 'שיווק קרקע' : 'בקשה'}</div>
              <div style="font-size:13px; color:var(--text-light);">${r.location || '-'} | ${new Date(r.created_at).toLocaleDateString('he-IL')}</div>
            </div>
            <span style="background:${r.status === 'pending' ? 'var(--warning)' : 'var(--success)'}; color:white; padding:4px 12px; border-radius:50px; font-size:13px;">${r.status === 'pending' ? 'בבדיקה' : 'טופל'}</span>
          </div>
        `).join('')}
      `;
    } catch (e) {
      container.innerHTML = '<div class="alert alert-error">שגיאה בטעינת הבקשות</div>';
    }
  }
}

// ===== CONTACT =====
function submitContact() {
  const name = document.getElementById('contactName').value;
  const email = document.getElementById('contactEmail').value;
  const message = document.getElementById('contactMessage').value;
  const alertEl = document.getElementById('contactAlert');

  if (!name || !email || !message) {
    alertEl.innerHTML = '<div class="alert alert-error">נא למלא את כל השדות הנדרשים</div>';
    return;
  }

  alertEl.innerHTML = '<div class="alert alert-success">ההודעה נשלחה בהצלחה! ניצור עמך קשר בהקדם.</div>';
  document.getElementById('contactName').value = '';
  document.getElementById('contactEmail').value = '';
  document.getElementById('contactPhone').value = '';
  document.getElementById('contactMessage').value = '';
}

// ===== UTILS =====
function formatPrice(num) {
  return Math.round(num).toLocaleString('he-IL');
}
