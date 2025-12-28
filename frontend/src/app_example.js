import React, { useState } from 'react';
import './App.css';

function App() {
  // stateler
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  // test etmek kolay olsun diye varsayılan 2 kullanıcı. Veritabanın işi.
  const [users, setUsers] = useState([
    { id: 1, name: 'Site Yöneticisi', email: 'yonetici@site.com', password: '123', apartmentNo: '1', isAdmin: true },
    { id: 2, name: 'Kullanıcı', email: 'sakin@site.com', password: '123', apartmentNo: '5', isAdmin: false }
  ]);

  // form verileri
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    name: '',
    apartmentNo: '',
    email: '',
    password: '',
    isAdmin: false
  });

  // içerik verisi
  const initialAnnouncements = [
    { id: 1, title: 'Kazan Dairesi Kontrolü', date: '25.09.2025', content: 'Kış gelmeden kontroller yapılacaktır.' },
    { id: 2, title: 'Çatı Tamiratı', date: '13.05.2025', content: 'Hafta sonu çatıya çıkmak yasaktır.' }
  ];

  const initialDues = [
    { id: 1, apartmentNo: '12', month: 'Aralık', amount: 750, status: 'Ödenmedi' },
    { id: 2, apartmentNo: '5', month: 'Aralık', amount: 750, status: 'Ödendi' }, // Örnek sakinin borcu
    { id: 3, apartmentNo: '8', month: 'Kasım', amount: 750, status: 'Ödenmedi' },
  ];

  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [newAnnounce, setNewAnnounce] = useState({ title: '', content: '' });

  const [complaints, setComplaints] = useState([
    { id: 1, text: 'Merdivenler temizlenmiyor.' }
  ]);
  const [newComplaint, setNewComplaint] = useState('');

  const [parkingSpots, setParkingSpots] = useState(Array(10).fill(false));
  const [dues, setDues] = useState(initialDues);
  const [newDebt, setNewDebt] = useState({ apartmentNo: '', month: '', amount: '' });

  // fonksiyonlar
  const closeModals = () => {
    setShowLoginModal(false);
    setShowRegisterModal(false);
    // Formları temizle
    setLoginData({ email: '', password: '' });
    setRegisterData({ name: '', apartmentNo: '', email: '', password: '', isAdmin: false });
  };

  // kayıt işlemleri.
  
  const submitRegister = () => {
    // doğrulama
    if (!registerData.name || !registerData.email || !registerData.password || !registerData.apartmentNo) {
      alert("Lütfen tüm alanları doldurunuz.");
      return;
    }

    // e-posta daha önce alınmış mı
    const existingUser = users.find(u => u.email === registerData.email);
    if (existingUser) {
      alert("Bu e-posta adresi ile zaten bir kayıt mevcut.");
      return;
    }

    // yeni kullanıcı oluştur
    const newUser = {
      id: Date.now(),
      name: registerData.name,
      email: registerData.email,
      password: registerData.password,
      apartmentNo: registerData.apartmentNo,
      isAdmin: registerData.isAdmin
    };

    // listeye ekle ve giriş yap
    setUsers([...users, newUser]);
    setCurrentUser(newUser);
    setIsLoggedIn(true);
    closeModals();
    alert(`Kayıt Başarılı! Hoş geldiniz, ${newUser.name}`);
  };

  // giriş
  const submitLogin = () => {
    if (!loginData.email || !loginData.password) {
      alert("Lütfen e-posta ve şifre giriniz.");
      return;
    }

    // kullanıcıyı bul
    const user = users.find(u => u.email === loginData.email && u.password === loginData.password);

    if (user) {
      setCurrentUser(user);
      setIsLoggedIn(true);
      closeModals();
    } else {
      alert("Hatalı E-posta veya Şifre!");
    }
  };

  //çıkış
  const handleLogout = () => {
    if (window.confirm("Çıkış yapmak istediğinize emin misiniz?")) {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setActiveTab('home');
      setLoginData({ email: '', password: '' });
    }
  };

  // menü işlemleri
  const addAnnouncement = () => {
    if (newAnnounce.title) {
      setAnnouncements([{
        id: Date.now(),
        title: newAnnounce.title,
        date: new Date().toLocaleDateString(),
        content: newAnnounce.content
      }, ...announcements]);
      setNewAnnounce({ title: '', content: '' });
    }
  };

  const addDebt = () => {
    if (newDebt.apartmentNo && newDebt.amount) {
      setDues([...dues, {
        id: Date.now(),
        apartmentNo: newDebt.apartmentNo,
        month: newDebt.month,
        amount: newDebt.amount,
        status: 'Ödenmedi'
      }]);
      setNewDebt({ apartmentNo: '', month: '', amount: '' });
      alert("Borç başarıyla eklendi.");
    }
  };

  const payDue = (id) => {
    const newDues = dues.map(d => d.id === id ? { ...d, status: 'Ödendi' } : d);
    setDues(newDues);
  };

  const toggleParking = (index) => {
    const newSpots = [...parkingSpots];
    newSpots[index] = !newSpots[index];
    setParkingSpots(newSpots);
  };

  // içerik
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        // yöneticiyse tüm borçları, sakin sadece kendi borcunu görcek.
        const myDebts = currentUser.isAdmin 
            ? dues.filter(d => d.status === 'Ödenmedi') 
            : dues.filter(d => d.apartmentNo === currentUser.apartmentNo && d.status === 'Ödenmedi');
            
        const totalDebtAmount = myDebts.reduce((acc, curr) => acc + Number(curr.amount), 0);
        const emptySpots = parkingSpots.filter(p => !p).length;

        return (
          <div className="tab-content fade-in">
            <h2 className="section-title">Genel Bakış</h2>
            
            <div className="stats-grid">
              <div className="stat-card blue">
                <h3>Aktif Duyurular</h3>
                <p className="stat-number">{announcements.length}</p>
              </div>
              <div className="stat-card green">
                <h3>Boş Otopark</h3>
                <p className="stat-number">{emptySpots} / 10</p>
              </div>
              <div className="stat-card red">
                <h3>{currentUser.isAdmin ? 'Toplam Alacak' : 'Toplam Borcunuz'}</h3>
                <p className="stat-number">{totalDebtAmount} TL</p>
              </div>
            </div>

            <div className="section-divider"></div>

            <h3 className="sub-title">Son Duyurular</h3>
            {currentUser?.isAdmin && (
              <div className="admin-action-box">
                <input type="text" placeholder="Duyuru Başlığı" value={newAnnounce.title} onChange={e => setNewAnnounce({ ...newAnnounce, title: e.target.value })} />
                <input type="text" placeholder="İçerik" value={newAnnounce.content} onChange={e => setNewAnnounce({ ...newAnnounce, content: e.target.value })} />
                <button onClick={addAnnouncement}>Yayınla</button>
              </div>
            )}

            <div className="announcement-list-home">
              {announcements.map(ann => (
                <div key={ann.id} className="announcement-item">
                  <div className="ann-date">{ann.date}</div>
                  <div className="ann-content">
                    <h4>{ann.title}</h4>
                    <p>{ann.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'parking':
        return (
          <div className="tab-content fade-in">
            <h2 className="section-title">Otopark Durumu</h2>
            <div className="parking-legend">
              <span className="dot green"></span> Boş
              <span className="dot red"></span> Dolu
            </div>
            <div className="parking-grid">
              {parkingSpots.map((isFull, index) => (
                <div key={index} className={`parking-slot ${isFull ? 'full' : 'empty'}`} onClick={() => toggleParking(index)}>
                  <span className="car-icon">{isFull ? '' : 'P'}</span>
                  <span className="slot-number">No: {index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'dues':
        const filteredDues = currentUser.isAdmin ? dues : dues.filter(d => d.apartmentNo === currentUser.apartmentNo);

        return (
          <div className="tab-content fade-in">
            <h2 className="section-title">Finansal Durum</h2>

            {currentUser.isAdmin && (
              <div className="admin-action-box debt-box">
                <h4>Borç Ekle</h4>
                <div className="input-row">
                  <input type="number" placeholder="Daire No" value={newDebt.apartmentNo} onChange={e => setNewDebt({ ...newDebt, apartmentNo: e.target.value })} />
                  <input type="text" placeholder="Ay (Örn: Ocak)" value={newDebt.month} onChange={e => setNewDebt({ ...newDebt, month: e.target.value })} />
                  <input type="number" placeholder="Tutar (TL)" value={newDebt.amount} onChange={e => setNewDebt({ ...newDebt, amount: e.target.value })} />
                  <button onClick={addDebt}>Ekle</button>
                </div>
              </div>
            )}

            <table className="custom-table">
              <thead>
                <tr>
                  <th>Daire</th>
                  <th>Ay</th>
                  <th>Tutar</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredDues.length > 0 ? filteredDues.map(d => (
                  <tr key={d.id}>
                    <td>Daire {d.apartmentNo}</td>
                    <td>{d.month}</td>
                    <td>{d.amount} TL</td>
                    <td>
                      <span className={`badge ${d.status === 'Ödendi' ? 'bg-green' : 'bg-red'}`}>{d.status}</span>
                    </td>
                    <td>
                      {d.status !== 'Ödendi' && (
                        <button className="btn-pay-small" onClick={() => payDue(d.id)}>
                          {currentUser.isAdmin ? 'Tahsil Et' : 'Öde'}
                        </button>
                      )}
                    </td>
                  </tr>
                )) : <tr><td colSpan="5" style={{ textAlign: 'center' }}>Kayıt bulunamadı.</td></tr>}
              </tbody>
            </table>
          </div>
        );

      case 'complaints':
        return (
          <div className="tab-content fade-in">
            <h2 className="section-title">Öneri & Şikayet</h2>
            <div className="complaint-box">
              <textarea placeholder="Mesajınız..." value={newComplaint} onChange={e => setNewComplaint(e.target.value)}></textarea>
              <button className="btn-send" onClick={() => {
                setComplaints([...complaints, { id: Date.now(), text: newComplaint }]);
                setNewComplaint('');
                alert("Gönderildi");
              }}>Gönder</button>
            </div>
            <div className="complaint-list">
              {complaints.map(c => (
                <div key={c.id} className="complaint-item">
                  <p>{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <>
      {!isLoggedIn ? (
        <div className="landing-container">
          <div className="landing-overlay"></div>
          <div className="landing-content">
            <h1>YÖNETİM360</h1>
            <p>Modern Site Yönetim Platformu</p>
            <div className="landing-btns">
              <button onClick={() => setShowRegisterModal(true)}>Kayıt Ol</button>
              <button onClick={() => setShowLoginModal(true)}>Giriş Yap</button>
            </div>
            <p style={{ marginTop: '20px', fontSize: '0.8rem', opacity: 0.8 }}>
                Demo Hesaplar:<br/>
                Yönetici: yonetici@site.com / 123<br/>
                Sakin: sakin@site.com / 123
            </p>
          </div>

          {showLoginModal && (
            <div className="modal-wrapper" onClick={closeModals}>
              <div className="modal-box" onClick={e => e.stopPropagation()}>
                <h3>Giriş Yap</h3>
                <input type="email" placeholder="E-posta" value={loginData.email} onChange={e => setLoginData({ ...loginData, email: e.target.value })} />
                <input type="password" placeholder="Şifre" value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} />
                <button className="btn-full" onClick={submitLogin}>Giriş</button>
              </div>
            </div>
          )}

          {showRegisterModal && (
            <div className="modal-wrapper" onClick={closeModals}>
              <div className="modal-box" onClick={e => e.stopPropagation()}>
                <h3>Kayıt Ol</h3>
                
                <input type="text" placeholder="Ad Soyad" value={registerData.name} onChange={e => setRegisterData({ ...registerData, name: e.target.value })} />
                <input type="text" placeholder="Daire No (Örn: 5)" value={registerData.apartmentNo} onChange={e => setRegisterData({ ...registerData, apartmentNo: e.target.value })} />
                <input type="email" placeholder="E-posta" value={registerData.email} onChange={e => setRegisterData({ ...registerData, email: e.target.value })} />
                <input type="password" placeholder="Şifre" value={registerData.password} onChange={e => setRegisterData({ ...registerData, password: e.target.value })} />
                
                {/* yönetici/sakin seçimi */}
                <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'15px'}}>
                    <input 
                        type="checkbox" 
                        id="isAdminCheck" 
                        style={{width:'auto', margin:0}}
                        checked={registerData.isAdmin}
                        onChange={e => setRegisterData({...registerData, isAdmin: e.target.checked})}
                    />
                    <label htmlFor="isAdminCheck" style={{fontSize:'0.9rem', cursor:'pointer'}}>Yönetici Hesabı Oluştur</label>
                </div>

                <button className="btn-full" onClick={submitRegister}>Kaydol</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="app-layout">
          <aside className="sidebar">
            <div className="brand">Y360</div>
            <nav>
              <button className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}>Ana Sayfa</button>
              <button className={activeTab === 'parking' ? 'active' : ''} onClick={() => setActiveTab('parking')}>Otopark</button>
              <button className={activeTab === 'dues' ? 'active' : ''} onClick={() => setActiveTab('dues')}>Aidat</button>
              <button className={activeTab === 'complaints' ? 'active' : ''} onClick={() => setActiveTab('complaints')}>Şikayet</button>
            </nav>
            <button className="btn-logout" onClick={handleLogout}>Çıkış Yap</button>
          </aside>

          <main className="main-wrapper">
            <header className="top-bar">
              <div className="welcome-text">
                <h2>Merhaba, {currentUser.name}</h2>
                <span className="role-badge">{currentUser.isAdmin ? 'YÖNETİCİ' : 'SAKİN'}</span>
              </div>
              <div className="building-info">
                 Daire: <strong>{currentUser.apartmentNo}</strong>
              </div>
            </header>
            <div className="content-area">
              {renderContent()}
            </div>
          </main>
        </div>
      )}
    </>
  );
}

export default App;