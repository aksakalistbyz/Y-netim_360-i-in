import React, { useState, useEffect } from 'react';
import './App.css';
import { authAPI, announcementAPI, feeAPI, parkingAPI, messageAPI, financeAPI, flatAPI } from './services/api';

function App() {
  // stateler
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(false);

  // form verileri
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    name: '',
    apartmentNo: '',
    email: '',
    password: '',
    phoneNumber: '',
    isAdmin: false
  });

  // içerik verisi
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnounce, setNewAnnounce] = useState({ title: '', content: '' });

  // ŞİKAYET SİSTEMİ - MESSAGE API KULLANIYOR
  const [complaints, setComplaints] = useState([]);
  const [newComplaint, setNewComplaint] = useState('');

  const [parkingSpots, setParkingSpots] = useState([]);
  const [dues, setDues] = useState([]);
  const [finances, setFinances] = useState([]);
  const [newFinance, setNewFinance] = useState({ type: 'income', description: '', amount: '', category: '' });
  const [flats, setFlats] = useState([]);
  const [newDue, setNewDue] = useState({ flatId: '', amount: '', month: '', year: '', dueDate: '' });

  // Sayfa yüklendiğinde token kontrolü
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      setCurrentUser(JSON.parse(user));
      setIsLoggedIn(true);
      loadData();
    }
  }, []);

  // Veri yükleme
  const loadData = async () => {
    try {
      // Duyuruları yükle
      const announcementsRes = await announcementAPI.getAll();
      if (announcementsRes.data.success) {
        setAnnouncements(announcementsRes.data.data.announcements || []);
      }

      // Aidatları yükle
      const feesRes = await feeAPI.getAll();
      if (feesRes.data.success) {
        setDues(feesRes.data.data.fees || []);
      }

      // Finans kayıtlarını yükle
      const financeRes = await financeAPI.getAll();
      if (financeRes.data.success) {
        setFinances(financeRes.data.data.records || []);
      }

      // Daireleri yükle
      const flatsRes = await flatAPI.getAll();
      if (flatsRes.data.success) {
        setFlats(flatsRes.data.data.flats || []);
      }

      // ŞİKAYETLERİ YÜK - MESSAGE API KULLAN
      const messagesRes = await messageAPI.getInbox();
      if (messagesRes.data.success) {
        setComplaints(messagesRes.data.data.inbox || []);
      }

      // Otopark yükle
      const parkingRes = await parkingAPI.getAll();
      if (parkingRes.data.success) {
        const slots = parkingRes.data.data.slots || [];
        const slotsArray = Array(10).fill(false);
        
        slots.forEach((slot) => {
          const num = parseInt(slot.slotNumber);
          if (num >= 1 && num <= 10) {
            const index = num - 1;
            slotsArray[index] = (slot.isOccupied === 1 || slot.isOccupied === true);
          }
        });
        
        setParkingSpots(slotsArray);
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    }
  };

  // fonksiyonlar
  const closeModals = () => {
    setShowLoginModal(false);
    setShowRegisterModal(false);
    setLoginData({ email: '', password: '' });
    setRegisterData({ name: '', apartmentNo: '', email: '', password: '', phoneNumber: '', isAdmin: false });
  };

  // kayıt işlemleri
  const submitRegister = async () => {
    if (!registerData.name || !registerData.email || !registerData.password) {
      alert("Lütfen tüm zorunlu alanları doldurunuz.");
      return;
    }

    if (!registerData.isAdmin && !registerData.apartmentNo) {
      alert("Sakin için apartman kodu zorunludur.");
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.register(
        registerData.name,
        registerData.email,
        registerData.password,
        registerData.phoneNumber,
        registerData.isAdmin,
        registerData.apartmentNo
      );

      if (response.data.success) {
        const { token, user } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setCurrentUser(user);
        setIsLoggedIn(true);
        closeModals();
        loadData();
        alert(`Kayıt Başarılı! Hoş geldiniz, ${user.firstName || user.fullName}`);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Kayıt işlemi başarısız';
      alert(errorMsg);
      console.error('Kayıt hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // giriş
  const submitLogin = async () => {
    if (!loginData.email || !loginData.password) {
      alert("Lütfen e-posta ve şifre giriniz.");
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login(loginData.email, loginData.password);

      if (response.data.success) {
        const { token, user } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setCurrentUser(user);
        setIsLoggedIn(true);
        closeModals();
        loadData();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Giriş başarısız';
      alert(errorMsg);
      console.error('Giriş hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // çıkış
  const handleLogout = async () => {
    if (window.confirm("Çıkış yapmak istediğinize emin misiniz?")) {
      try {
        await authAPI.logout();
      } catch (error) {
        console.error('Logout hatası:', error);
      } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoggedIn(false);
        setCurrentUser(null);
        setActiveTab('home');
        setAnnouncements([]);
        setDues([]);
        setParkingSpots([]);
        setComplaints([]);
      }
    }
  };

  // DUYURU EKLEME
  const addAnnouncement = async () => {
    if (!newAnnounce.title) {
      alert('Duyuru başlığı giriniz');
      return;
    }

    try {
      const response = await announcementAPI.create(
        newAnnounce.title,
        newAnnounce.content,
        'normal'
      );

      if (response.data.success) {
        await loadData();
        setNewAnnounce({ title: '', content: '' });
        alert('Duyuru başarıyla yayınlandı');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Duyuru eklenemedi');
    }
  };

  // DUYURU SİLME
  const deleteAnnouncement = async (id) => {
    if (!window.confirm('Bu duyuruyu silmek istediğinize emin misiniz?')) return;

    try {
      const response = await announcementAPI.delete(id);
      if (response.data.success) {
        await loadData();
        alert('Duyuru silindi');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Duyuru silinemedi');
    }
  };

  // FİNANS EKLEME
  const addFinance = async () => {
    if (!newFinance.description || !newFinance.amount) {
      alert('Açıklama ve tutar giriniz');
      return;
    }

    try {
      const response = await financeAPI.create(
        newFinance.type,
        newFinance.description,
        parseFloat(newFinance.amount),
        newFinance.category || 'Diğer',
        new Date(),
        null
      );

      if (response.data.success) {
        await loadData();
        setNewFinance({ type: 'income', description: '', amount: '', category: '' });
        alert('Finans kaydı eklendi');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Finans eklenemedi');
    }
  };

  // FİNANS SİLME
  const deleteFinance = async (id) => {
    if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;

    try {
      const response = await financeAPI.delete(id);
      if (response.data.success) {
        await loadData();
        alert('Kayıt silindi');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Kayıt silinemedi');
    }
  };

  // AİDAT EKLEME
  const addDue = async () => {
    if (!newDue.flatId || !newDue.amount || !newDue.month || !newDue.year) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      const response = await feeAPI.addSingle(
        parseInt(newDue.flatId),
        parseFloat(newDue.amount),
        newDue.dueDate || null,
        parseInt(newDue.month),
        parseInt(newDue.year),
        `${newDue.month}/${newDue.year} Aidatı`
      );

      if (response.data.success) {
        await loadData();
        setNewDue({ flatId: '', amount: '', month: '', year: '', dueDate: '' });
        alert('Aidat eklendi');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Aidat eklenemedi');
    }
  };

  // AİDAT ÖDEME
  const payDue = async (feeId) => {
    try {
      const response = await feeAPI.updateStatus(feeId, 'paid', 'Nakit');
      
      if (response.data.success) {
        await loadData();
        alert('Ödeme başarıyla kaydedildi');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Ödeme işlemi başarısız');
    }
  };

  // AİDAT SİLME
  const deleteFee = async (id) => {
    if (!window.confirm('Bu aidatı silmek istediğinize emin misiniz?')) return;

    try {
      const response = await feeAPI.delete(id);
      if (response.data.success) {
        await loadData();
        alert('Aidat silindi');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Aidat silinemedi');
    }
  };

  // OTOPARK TOGGLE
  const toggleParking = async (index) => {
    try {
      const slotId = index + 1;
      console.log(`🔄 Otopark ${slotId} toggle çağrılıyor...`);
      
      const response = await parkingAPI.toggle(slotId);
      
      if (response.data.success) {
        console.log('✅ Toggle başarılı, backend response:', response.data);
        
        // Otopark verilerini yeniden yükle
        const parkingRes = await parkingAPI.getAll();
        if (parkingRes.data.success) {
          const slots = parkingRes.data.data.slots || [];
          const slotsArray = Array(10).fill(false);
          
          slots.forEach((slot) => {
            const num = parseInt(slot.slotNumber);
            if (num >= 1 && num <= 10) {
              const index = num - 1;
              slotsArray[index] = (slot.isOccupied === 1 || slot.isOccupied === true);
            }
          });
          
          console.log('🎯 Güncellenmiş slotsArray:', slotsArray);
          setParkingSpots(slotsArray);
        }
      }
    } catch (error) {
      console.error('❌ Otopark güncelleme hatası:', error);
      alert('İşlem başarısız: ' + (error.response?.data?.message || error.message));
    }
  };

  // ŞİKAYET GÖNDERME - SADECE SAKİNLER
  const sendComplaint = async () => {
    if (!newComplaint.trim()) {
      alert('Lütfen mesajınızı yazınız');
      return;
    }

    // YÖNETİCİLER ŞİKAYET GÖNDEREMEZ
    if (currentUser?.role === 'admin') {
      alert('Yöneticiler şikayet gönderemez');
      return;
    }

    try {
      const response = await messageAPI.send(
        null, // receiverId null çünkü tüm yöneticilere gidiyor
        'Şikayet/Öneri',
        newComplaint
      );

      if (response.data.success) {
        setNewComplaint('');
        alert('Şikayetiniz gönderildi');
        await loadData();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Şikayet gönderilemedi');
    }
  };

  // ŞİKAYET SİLME - YÖNETİCİLER SİLEBİLİR
  const deleteComplaint = async (id) => {
    if (!window.confirm('Bu şikayeti silmek istediğinize emin misiniz?')) return;

    try {
      const response = await messageAPI.delete(id);
      if (response.data.success) {
        await loadData();
        alert('Şikayet silindi');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Şikayet silinemedi');
    }
  };

  // içerik
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        const myDebts = currentUser?.role === 'admin' 
            ? dues.filter(d => d.status === 'pending' || d.status === 'overdue') 
            : dues.filter(d => d.flatId === currentUser?.flatId && (d.status === 'pending' || d.status === 'overdue'));
            
        const totalDebtAmount = myDebts.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
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
                <p className="stat-number">{emptySpots} / {parkingSpots.length}</p>
              </div>
              <div className="stat-card red">
                <h3>{currentUser?.role === 'admin' ? 'Toplam Alacak' : 'Toplam Borcunuz'}</h3>
                <p className="stat-number">{totalDebtAmount.toFixed(2)} TL</p>
              </div>
            </div>

            <div className="section-divider"></div>

            <h3 className="sub-title">Son Duyurular</h3>
            {currentUser?.role === 'admin' && (
              <div className="admin-action-box">
                <input type="text" placeholder="Duyuru Başlığı" value={newAnnounce.title} onChange={e => setNewAnnounce({ ...newAnnounce, title: e.target.value })} />
                <input type="text" placeholder="İçerik" value={newAnnounce.content} onChange={e => setNewAnnounce({ ...newAnnounce, content: e.target.value })} />
                <button onClick={addAnnouncement}>Yayınla</button>
              </div>
            )}

            <div className="announcement-list-home">
              {announcements.length > 0 ? announcements.map(ann => (
                <div key={ann.announcementId} className="announcement-item">
                  <div className="ann-date">{new Date(ann.createdAt).toLocaleDateString('tr-TR')}</div>
                  <div className="ann-content">
                    <h4>{ann.title}</h4>
                    <p>{ann.content}</p>
                    {currentUser?.role === 'admin' && (
                      <button 
                        onClick={() => deleteAnnouncement(ann.announcementId)}
                        style={{
                          marginTop: '10px',
                          padding: '0.5rem 1rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: 'pointer'
                        }}
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              )) : <p>Henüz duyuru yok.</p>}
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
                  <span className="car-icon">{isFull ? '🚗' : 'P'}</span>
                  <span className="slot-number">No: {index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'dues':
        const filteredDues = currentUser?.role === 'admin' 
          ? dues 
          : dues.filter(d => d.flatId === currentUser?.flatId);

        return (
          <div className="tab-content fade-in">
            <h2 className="section-title">Aidat & Finans</h2>

            {/* AİDAT EKLEME - SADECE YÖNETİCİ */}
            {currentUser?.role === 'admin' && (
              <div className="admin-action-box" style={{ marginBottom: '2rem' }}>
                <h4>Aidat Ekle</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <select 
                    value={newDue.flatId} 
                    onChange={e => setNewDue({ ...newDue, flatId: e.target.value })}
                    style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}
                  >
                    <option value="">Daire Seçin</option>
                    {flats.map(flat => (
                      <option key={flat.flatId} value={flat.flatId}>
                        Daire {flat.flatNumber} - Blok {flat.block || 'A'}
                      </option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    placeholder="Tutar (TL)" 
                    value={newDue.amount} 
                    onChange={e => setNewDue({ ...newDue, amount: e.target.value })} 
                  />
                  <input 
                    type="number" 
                    placeholder="Ay (1-12)" 
                    min="1"
                    max="12"
                    value={newDue.month} 
                    onChange={e => setNewDue({ ...newDue, month: e.target.value })} 
                  />
                  <input 
                    type="number" 
                    placeholder="Yıl (2024)" 
                    value={newDue.year} 
                    onChange={e => setNewDue({ ...newDue, year: e.target.value })} 
                  />
                  <input 
                    type="date" 
                    placeholder="Son Ödeme Tarihi" 
                    value={newDue.dueDate} 
                    onChange={e => setNewDue({ ...newDue, dueDate: e.target.value })} 
                  />
                  <button onClick={addDue} style={{ gridColumn: 'span 1' }}>Aidat Ekle</button>
                </div>
              </div>
            )}

            {/* FİNANS EKLEME - SADECE YÖNETİCİ */}
            {currentUser?.role === 'admin' && (
              <div className="admin-action-box" style={{ marginBottom: '2rem' }}>
                <h4>Finans Kaydı Ekle</h4>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <select 
                    value={newFinance.type} 
                    onChange={e => setNewFinance({ ...newFinance, type: e.target.value })}
                    style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}
                  >
                    <option value="income">Gelir</option>
                    <option value="expense">Gider</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Açıklama" 
                    value={newFinance.description} 
                    onChange={e => setNewFinance({ ...newFinance, description: e.target.value })} 
                  />
                  <input 
                    type="number" 
                    placeholder="Tutar" 
                    value={newFinance.amount} 
                    onChange={e => setNewFinance({ ...newFinance, amount: e.target.value })} 
                  />
                  <input 
                    type="text" 
                    placeholder="Kategori" 
                    value={newFinance.category} 
                    onChange={e => setNewFinance({ ...newFinance, category: e.target.value })} 
                  />
                </div>
                <button onClick={addFinance}>Finans Ekle</button>
              </div>
            )}

            {/* FİNANS LİSTESİ */}
            {currentUser?.role === 'admin' && finances.length > 0 && (
              <>
                <h3 className="sub-title">Finans Kayıtları</h3>
                <table className="custom-table" style={{ marginBottom: '2rem' }}>
                  <thead>
                    <tr>
                      <th>Tür</th>
                      <th>Açıklama</th>
                      <th>Tutar</th>
                      <th>Tarih</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finances.map(f => (
                      <tr key={f.recordId}>
                        <td>
                          <span className={`badge ${f.type === 'income' ? 'bg-green' : 'bg-red'}`}>
                            {f.type === 'income' ? 'Gelir' : 'Gider'}
                          </span>
                        </td>
                        <td>{f.description}</td>
                        <td>{f.amount} TL</td>
                        <td>{new Date(f.transactionDate).toLocaleDateString('tr-TR')}</td>
                        <td>
                          <button 
                            onClick={() => deleteFinance(f.recordId)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.5rem',
                              cursor: 'pointer'
                            }}
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* AİDAT LİSTESİ */}
            <h3 className="sub-title">Aidat Durumu</h3>
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
                  <tr key={d.feeId}>
                    <td>Daire {d.flatNumber || 'N/A'}</td>
                    <td>{d.month}/{d.year}</td>
                    <td>{d.amount} TL</td>
                    <td>
                      <span className={`badge ${d.status === 'paid' ? 'bg-green' : 'bg-red'}`}>
                        {d.status === 'paid' ? 'Ödendi' : 'Ödenmedi'}
                      </span>
                    </td>
                    <td>
                      {d.status !== 'paid' && (
                        <button className="btn-pay-small" onClick={() => payDue(d.feeId)}>
                          {currentUser?.role === 'admin' ? 'Tahsil Et' : 'Öde'}
                        </button>
                      )}
                      {currentUser?.role === 'admin' && (
                        <button 
                          onClick={() => deleteFee(d.feeId)}
                          style={{
                            marginLeft: '10px',
                            padding: '0.5rem 1rem',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer'
                          }}
                        >
                          Sil
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
            
            {/* SADECE SAKİNLER ŞİKAYET GÖNDEREBİLİR */}
            {currentUser?.role !== 'admin' && (
              <div className="complaint-box">
                <textarea 
                  placeholder="Mesajınız..." 
                  value={newComplaint} 
                  onChange={e => setNewComplaint(e.target.value)}
                />
                <button className="btn-send" onClick={sendComplaint}>Gönder</button>
              </div>
            )}

            {currentUser?.role === 'admin' && (
              <p style={{ color: '#64748b', marginBottom: '1rem' }}>
                ℹ️ Yönetici olarak şikayetleri görüntüleyebilir ve silebilirsiniz.
              </p>
            )}

            <div className="complaint-list">
              {complaints.length > 0 ? complaints.map(c => (
                <div key={c.messageId} className="complaint-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                        👤 {c.senderName || 'Kullanıcı'} • {new Date(c.createdAt).toLocaleDateString('tr-TR')}
                      </div>
                      <p>{c.content}</p>
                    </div>
                    {currentUser?.role === 'admin' && (
                      <button 
                        onClick={() => deleteComplaint(c.messageId)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          marginLeft: '10px'
                        }}
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              )) : <p>Henüz şikayet yok.</p>}
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
          </div>

          {showLoginModal && (
            <div className="modal-wrapper" onClick={closeModals}>
              <div className="modal-box" onClick={e => e.stopPropagation()}>
                <h3>Giriş Yap</h3>
                <input 
                  type="email" 
                  placeholder="E-posta" 
                  value={loginData.email} 
                  onChange={e => setLoginData({ ...loginData, email: e.target.value })} 
                  disabled={loading}
                />
                <input 
                  type="password" 
                  placeholder="Şifre" 
                  value={loginData.password} 
                  onChange={e => setLoginData({ ...loginData, password: e.target.value })} 
                  disabled={loading}
                />
                <button className="btn-full" onClick={submitLogin} disabled={loading}>
                  {loading ? 'Giriş yapılıyor...' : 'Giriş'}
                </button>
              </div>
            </div>
          )}

          {showRegisterModal && (
            <div className="modal-wrapper" onClick={closeModals}>
              <div className="modal-box" onClick={e => e.stopPropagation()}>
                <h3>Kayıt Ol</h3>
                
                <input 
                  type="text" 
                  placeholder="Ad Soyad" 
                  value={registerData.name} 
                  onChange={e => setRegisterData({ ...registerData, name: e.target.value })} 
                  disabled={loading}
                />
                <input 
                  type="tel" 
                  placeholder="Telefon (Opsiyonel)" 
                  value={registerData.phoneNumber} 
                  onChange={e => setRegisterData({ ...registerData, phoneNumber: e.target.value })} 
                  disabled={loading}
                />
                <input 
                  type="email" 
                  placeholder="E-posta" 
                  value={registerData.email} 
                  onChange={e => setRegisterData({ ...registerData, email: e.target.value })} 
                  disabled={loading}
                />
                <input 
                  type="password" 
                  placeholder="Şifre (min 6 karakter)" 
                  value={registerData.password} 
                  onChange={e => setRegisterData({ ...registerData, password: e.target.value })} 
                  disabled={loading}
                />
                
                <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'15px'}}>
                    <input 
                        type="checkbox" 
                        id="isAdminCheck" 
                        style={{width:'auto', margin:0}}
                        checked={registerData.isAdmin}
                        onChange={e => setRegisterData({...registerData, isAdmin: e.target.checked})}
                        disabled={loading}
                    />
                    <label htmlFor="isAdminCheck" style={{fontSize:'0.9rem', cursor:'pointer'}}>
                      Yönetici Hesabı Oluştur
                    </label>
                </div>

                {!registerData.isAdmin && (
                  <input 
                    type="text" 
                    placeholder="Apartman Kodu (Sakin için zorunlu)" 
                    value={registerData.apartmentNo} 
                    onChange={e => setRegisterData({ ...registerData, apartmentNo: e.target.value })} 
                    disabled={loading}
                  />
                )}

                <button className="btn-full" onClick={submitRegister} disabled={loading}>
                  {loading ? 'Kaydediliyor...' : 'Kaydol'}
                </button>
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
              <button className={activeTab === 'dues' ? 'active' : ''} onClick={() => setActiveTab('dues')}>Aidat & Finans</button>
              <button className={activeTab === 'complaints' ? 'active' : ''} onClick={() => setActiveTab('complaints')}>Şikayet</button>
            </nav>
            <button className="btn-logout" onClick={handleLogout}>Çıkış Yap</button>
          </aside>

          <main className="main-wrapper">
            <header className="top-bar">
              <div className="welcome-text">
                <h2>Merhaba, {currentUser?.fullName || currentUser?.firstName || 'Kullanıcı'}</h2>
                <span className="role-badge">{currentUser?.role === 'admin' ? 'YÖNETİCİ' : 'SAKİN'}</span>
              </div>
              <div className="building-info">
                 Apartman: <strong>{currentUser?.apartmentCode || 'N/A'}</strong>
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