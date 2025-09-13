import React, { useState, useRef, useEffect } from 'react';
import { Upload, Search, MapPin, User, Handshake, ArrowRight, Phone, Route, Navigation, CheckCircle, AlertCircle, Truck } from 'lucide-react';

const CarrierFinderApp = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driversData, setDriversData] = useState([]);
  const [citiesData, setCitiesData] = useState([]);
  const [searchResults, setSearchResults] = useState({
    exact: [],
    geo: [],
    composite: []
  });
  const [filesLoaded, setFilesLoaded] = useState({
    drivers: false,
    cities: false,
    linePaths: false
  });
  const [isSearching, setIsSearching] = useState(false);
  const [showUploadHint, setShowUploadHint] = useState(true);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [modalDriver, setModalDriver] = useState(null);

  const fileInputRefs = {
    drivers: useRef(null),
    cities: useRef(null),
    linePaths: useRef(null)
  };

  // Автоскрытие подсказки о загрузке
  useEffect(() => {
    if (Object.values(filesLoaded).some(Boolean)) {
      setShowUploadHint(false);
    }
  }, [filesLoaded]);

  // Функция извлечения номера телефона
  const extractPhone = (driverName) => {
    if (!driverName) return '+7 (XXX) XXX-XX-XX';
    const phoneMatch = driverName.match(/\+7\d{10}/);
    return phoneMatch ? phoneMatch[0] : '+7 (XXX) XXX-XX-XX';
  };

  // Функция извлечения имени водителя
  const extractDriverName = (driverString) => {
    if (!driverString) return 'Водитель';
    // Убираем телефон из строки
    return driverString.replace(/\+7\d{10}/, '').trim();
  };

  // Функция для чтения CSV файла
  const readCSVFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target.result;
        const lines = csv.split('\n').filter(line => line.trim());
        if (lines.length === 0) return resolve([]);
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = lines.slice(1).map(line => {
          const values = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim().replace(/"/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim().replace(/"/g, ''));
          
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = values[index] || '';
          });
          return obj;
        });
        resolve(data);
      };
      reader.onerror = reject;
      reader.readAsText(file, 'utf-8');
    });
  };

  // Обработка загрузки файлов
  const handleFileUpload = async (fileType, file) => {
    try {
      const data = await readCSVFile(file);
      
      switch (fileType) {
        case 'drivers':
          setDriversData(data);
          setFilesLoaded(prev => ({ ...prev, drivers: true }));
          break;
        case 'cities':
          setCitiesData(data);
          setFilesLoaded(prev => ({ ...prev, cities: true }));
          break;
        case 'linePaths':
          setFilesLoaded(prev => ({ ...prev, linePaths: true }));
          break;
      }
    } catch (error) {
      console.error(`Ошибка загрузки файла ${fileType}:`, error);
    }
  };

  // Функция для очистки текста от длинных тире
  const cleanText = (text) => {
    if (!text) return '';
    return text
      .replace(/—/g, '→')
      .replace(/\s+→\s+/g, ' → ')
      .trim();
  };

  // Функция открытия модального окна водителя
  const openDriverModal = (driver, originalData = null) => {
    const driverInfo = originalData ? {
      id: driver.id,
      name: extractDriverName(originalData['Перевозчик'] || driver.name),
      phone: extractPhone(originalData['Перевозчик']),
      routes: cleanText(originalData['Маршруты из истории'] || 'Не указано'),
      details: cleanText(originalData['Города (детализация)'] || 'Не указано'),
      branches: originalData['Ветки (может обслужить)'] || 'Не указано',
      corridors: originalData['Коридоры (может обслужить)'] || 'Не указано',
      searchRoute: driver.route || null,
      duration: driver.duration || null
    } : driver;
    
    setModalDriver(driverInfo);
    setShowDriverModal(true);
  };

  const closeDriverModal = () => {
    setShowDriverModal(false);
    setModalDriver(null);
  };

  // Симуляция поиска перевозчиков
  const searchDrivers = async () => {
    if (!fromCity || !toCity || !driversData.length) return;

    setIsSearching(true);
    
    // Имитация задержки поиска для красивой анимации
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockResults = {
      exact: driversData.slice(0, 3).map((driver, index) => ({
        id: index,
        name: extractDriverName(driver['Перевозчик'] || `Водитель ${index + 1}`),
        phone: extractPhone(driver['Перевозчик']),
        route: `${fromCity} → ${toCity}`,
        type: 'exact',
        duration: '4-6 часов'
      })),
      geo: driversData.slice(3, 6).map((driver, index) => ({
        id: index + 3,
        name: extractDriverName(driver['Перевозчик'] || `Водитель ${index + 4}`),
        phone: extractPhone(driver['Перевозчик']),
        route: `${fromCity} → Пересадка → ${toCity}`,
        type: 'geo',
        duration: '5-8 часов'
      })),
      composite: driversData.slice(6, 9).map((driver, index) => ({
        id: index + 6,
        name: extractDriverName(driver['Перевозчик'] || `Водитель ${index + 7}`),
        phone: extractPhone(driver['Перевозчик']),
        route: `Составной: ${fromCity} + пересадки → ${toCity}`,
        type: 'composite',
        duration: '6-12 часов'
      }))
    };

    setSearchResults(mockResults);
    setIsSearching(false);
  };

  // Компонент загрузки файла
  const FileUploadButton = ({ fileType, label, loaded, icon: Icon }) => (
    <div className="relative group">
      <button
        onClick={() => fileInputRefs[fileType].current?.click()}
        className={`relative overflow-hidden px-6 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 ${
          loaded 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30' 
            : 'bg-white text-gray-700 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        {loaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 opacity-20 animate-pulse"></div>
        )}
        <div className="relative flex items-center justify-center">
          {loaded ? <CheckCircle className="w-5 h-5 mr-2" /> : <Icon className="w-5 h-5 mr-2" />}
          {loaded ? `✨ ${label}` : label}
        </div>
      </button>
      <input
        ref={fileInputRefs[fileType]}
        type="file"
        accept=".csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(fileType, file);
        }}
        className="hidden"
      />
      {!loaded && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-bounce"></div>
      )}
    </div>
  );

  // Компонент карточки водителя
  const DriverCard = ({ driver, onClick, index }) => (
    <div
      className="transform transition-all duration-300 hover:scale-105 cursor-pointer"
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={onClick}
    >
      <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 relative overflow-hidden group">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-800 mb-1">{driver.name}</h3>
              <div className="flex items-center text-gray-600 mb-2">
                <Phone className="w-4 h-4 mr-1" />
                <span className="text-sm">{driver.phone}</span>
              </div>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              driver.type === 'exact' ? 'bg-green-100 text-green-600' :
              driver.type === 'geo' ? 'bg-blue-100 text-blue-600' :
              'bg-purple-100 text-purple-600'
            }`}>
              <Truck className="w-6 h-6" />
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center text-sm text-gray-700">
              <Route className="w-4 h-4 mr-2 text-blue-500" />
              <span className="font-medium">{driver.route}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">⏱ {driver.duration}</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                openDriverModal(driver, driversData.find(d => extractDriverName(d['Перевозчик']) === driver.name));
              }}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
            >
              Подробнее
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Компонент результатов поиска
  const SearchResults = () => {
    if (isSearching) {
      return (
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto mb-4"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-purple-200 rounded-full animate-ping border-t-purple-600 mx-auto"></div>
            </div>
            <p className="text-gray-600 font-semibold">Ищем лучших перевозчиков...</p>
          </div>
        </div>
      );
    }

    const categories = [
      { key: 'exact', title: 'ТОЧНЫЕ МАРШРУТЫ', color: 'from-green-500 to-emerald-600', icon: CheckCircle },
      { key: 'geo', title: 'ГЕОГРАФИЧЕСКИЕ', color: 'from-blue-500 to-cyan-600', icon: Navigation },
      { key: 'composite', title: 'СОСТАВНЫЕ', color: 'from-purple-500 to-pink-600', icon: Route }
    ];

    return (
      <div className="grid grid-cols-3 gap-8">
        {categories.map(({ key, title, color, icon: Icon }) => (
          <div key={key} className="space-y-4">
            <div className={`bg-gradient-to-r ${color} text-white rounded-2xl p-4 text-center shadow-lg`}>
              <div className="flex items-center justify-center mb-2">
                <Icon className="w-6 h-6 mr-2" />
                <h3 className="font-bold text-lg">{title}</h3>
              </div>
              <div className="text-sm opacity-90">
                {searchResults[key].length} {searchResults[key].length === 1 ? 'вариант' : 'вариантов'}
              </div>
            </div>
            
            <div className="space-y-4 animate-fadeIn">
              {searchResults[key].map((driver, index) => (
                <DriverCard
                  key={driver.id}
                  driver={driver}
                  index={index}
                  onClick={() => openDriverModal(driver, driversData.find(d => extractDriverName(d['Перевозчик']) === driver.name))}
                />
              ))}
              {searchResults[key].length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Перевозчики не найдены</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Компонент списка всех водителей
  const DriversGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fadeIn">
      {driversData.map((driver, index) => {
        const driverName = extractDriverName(driver['Перевозчик'] || `Водитель ${index + 1}`);
        const phone = extractPhone(driver['Перевозчик']);
        
        return (
          <div
            key={index}
            className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
            onClick={() => openDriverModal({ id: index, name: driverName, phone }, driver)}
          >
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <User className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2">{driverName}</h3>
                <div className="text-sm text-gray-600 mb-4">
                  <Phone className="w-4 h-4 inline mr-1" />
                  {phone}
                </div>
                <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                  <Truck className="w-4 h-4 mr-1" />
                  Перевозчик
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Добавляем CSS анимации */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .font-inter {
          font-family: 'Inter', sans-serif;
        }
      `}</style>

      {/* Модальное окно водителя */}
      {showDriverModal && modalDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeDriverModal}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{modalDriver.name}</h2>
                  <div className="flex items-center text-white text-opacity-90">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{modalDriver.phone}</span>
                  </div>
                </div>
                <button 
                  onClick={closeDriverModal}
                  className="text-white hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {modalDriver.searchRoute && (
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-4 border border-green-200">
                  <h3 className="font-bold text-green-800 mb-2 flex items-center">
                    <Route className="w-5 h-5 mr-2" />
                    Найденный маршрут
                  </h3>
                  <p className="text-green-700 font-semibold">{modalDriver.searchRoute}</p>
                  {modalDriver.duration && (
                    <div className="text-sm text-green-600 mt-2">⏱ {modalDriver.duration}</div>
                  )}
                </div>
              )}
              
              {modalDriver.routes && modalDriver.routes !== 'Не указано' && (
                <div className="bg-blue-50 rounded-2xl p-4">
                  <h3 className="font-bold text-blue-800 mb-3 flex items-center">
                    <Navigation className="w-5 h-5 mr-2" />
                    Маршруты из истории
                  </h3>
                  <p className="text-blue-700 leading-relaxed">{modalDriver.routes}</p>
                </div>
              )}
              
              {modalDriver.details && modalDriver.details !== 'Не указано' && (
                <div className="bg-purple-50 rounded-2xl p-4">
                  <h3 className="font-bold text-purple-800 mb-3 flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Детализация городов
                  </h3>
                  <p className="text-purple-700 leading-relaxed">{modalDriver.details}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modalDriver.branches && modalDriver.branches !== 'Не указано' && (
                  <div className="bg-yellow-50 rounded-2xl p-4">
                    <h3 className="font-bold text-yellow-800 mb-3">🚛 Ветки</h3>
                    <p className="text-yellow-700 text-sm leading-relaxed">{modalDriver.branches}</p>
                  </div>
                )}
                
                {modalDriver.corridors && modalDriver.corridors !== 'Не указано' && (
                  <div className="bg-pink-50 rounded-2xl p-4">
                    <h3 className="font-bold text-pink-800 mb-3">🛣 Коридоры</h3>
                    <p className="text-pink-700 text-sm leading-relaxed">{modalDriver.corridors}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-4 pt-4">
                <button className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-2xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center justify-center">
                  <Phone className="w-5 h-5 mr-2" />
                  Позвонить
                </button>
                <button className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-2xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center">
                  <Handshake className="w-5 h-5 mr-2" />
                  Заказать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="font-inter">
        <div className="max-w-7xl mx-auto p-6">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Система поиска перевозчиков
            </h1>
            <p className="text-gray-600">Найдите идеального перевозчика для вашего маршрута</p>
          </div>

          {/* Загрузка файлов */}
          {showUploadHint && (
            <div className="mb-8 p-6 bg-white rounded-3xl shadow-lg border-2 border-dashed border-blue-200 animate-fadeIn">
              <div className="text-center mb-6">
                <Upload className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">Загрузите данные для начала работы</h3>
                <p className="text-gray-600">Загрузите CSV файлы с информацией о перевозчиках и городах</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FileUploadButton fileType="drivers" label="Перевозчики" loaded={filesLoaded.drivers} icon={User} />
                <FileUploadButton fileType="cities" label="Города" loaded={filesLoaded.cities} icon={MapPin} />
                <FileUploadButton fileType="linePaths" label="Маршруты" loaded={filesLoaded.linePaths} icon={Route} />
              </div>
            </div>
          )}

          {Object.values(filesLoaded).every(Boolean) && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-2xl shadow-lg animate-fadeIn">
              <div className="flex items-center justify-center">
                <CheckCircle className="w-6 h-6 mr-2" />
                <span className="font-semibold">✨ Все данные загружены! Система готова к работе</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Основная панель */}
            <div className="xl:col-span-3 space-y-8">
              {/* Навигационные вкладки */}
              <div className="flex flex-wrap gap-4 justify-center">
                {[
                  { id: 'search', label: 'ПОИСК', icon: Search, color: 'from-blue-500 to-cyan-600' },
                  { id: 'drivers', label: 'ВОДИТЕЛИ', icon: User, color: 'from-green-500 to-emerald-600' },
                  { id: 'deals', label: 'СДЕЛКИ', icon: Handshake, color: 'from-purple-500 to-pink-600' }
                ].map(({ id, label, icon: Icon, color }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 ${
                      activeTab === id
                        ? `bg-gradient-to-r ${color} text-white shadow-lg`
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                    }`}
                  >
                    <Icon className="w-6 h-6 mr-3" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Контент вкладок */}
              <div className="bg-white rounded-3xl shadow-xl p-8 min-h-[600px]">
                {activeTab === 'search' && (
                  <div className="space-y-8">
                    {/* Поля поиска */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Откуда"
                          value={fromCity}
                          onChange={(e) => setFromCity(e.target.value)}
                          className="w-full px-6 py-4 rounded-2xl border-2 border-gray-200 text-center font-semibold text-lg focus:border-blue-400 focus:outline-none transition-colors"
                        />
                        <MapPin className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      </div>
                      
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Куда"
                          value={toCity}
                          onChange={(e) => setToCity(e.target.value)}
                          className="w-full px-6 py-4 rounded-2xl border-2 border-gray-200 text-center font-semibold text-lg focus:border-blue-400 focus:outline-none transition-colors"
                        />
                        <MapPin className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      </div>
                      
                      <button
                        onClick={searchDrivers}
                        disabled={!fromCity || !toCity || !driversData.length || isSearching}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                      >
                        {isSearching ? (
                          <div className="w-6 h-6 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                        ) : (
                          <>
                            <Search className="w-6 h-6 mr-2" />
                            НАЙТИ
                          </>
                        )}
                      </button>
                    </div>

                    <SearchResults />
                  </div>
                )}

                {activeTab === 'drivers' && (
                  <div>
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-gray-800 mb-2">Все перевозчики</h2>
                      <p className="text-gray-600">Найдено {driversData.length} перевозчиков</p>
                    </div>
                    <DriversGrid />
                  </div>
                )}

                {activeTab === 'deals' && (
                  <div className="text-center py-20">
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Handshake className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Модуль "Сделки"</h2>
                    <p className="text-gray-600 text-lg">Функционал в разработке</p>
                    <div className="mt-8 inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-xl font-semibold">
                      🚀 Скоро будет доступен
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Боковая панель - карточка водителя */}
            <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8 text-white min-h-[600px] relative overflow-hidden">
              {/* Декоративные элементы */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-16 -translate-y-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full transform -translate-x-12 translate-y-12"></div>
              
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold bg-white bg-opacity-20 rounded-2xl py-3 px-6 backdrop-blur-sm">
                    КАРТОЧКА ВОДИТЕЛЯ
                  </h3>
                </div>
                
                {selectedDriver ? (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <User className="w-10 h-10" />
                      </div>
                      <h4 className="text-2xl font-bold mb-2">{selectedDriver.name}</h4>
                      <div className="flex items-center justify-center text-white text-opacity-90">
                        <Phone className="w-4 h-4 mr-2" />
                        <span>{selectedDriver.phone}</span>
                      </div>
                    </div>
                    
                    {selectedDriver.routes && (
                      <div className="bg-white bg-opacity-10 rounded-2xl p-4 backdrop-blur-sm">
                        <h5 className="font-bold text-sm uppercase tracking-wider mb-2 text-white text-opacity-80">Маршруты из истории</h5>
                        <p className="text-sm leading-relaxed">{selectedDriver.routes}</p>
                      </div>
                    )}
                    
                    {selectedDriver.details && (
                      <div className="bg-white bg-opacity-10 rounded-2xl p-4 backdrop-blur-sm">
                        <h5 className="font-bold text-sm uppercase tracking-wider mb-2 text-white text-opacity-80">Детализация городов</h5>
                        <p className="text-sm leading-relaxed">{selectedDriver.details}</p>
                      </div>
                    )}
                    
                    {selectedDriver.route && (
                      <div className="bg-white bg-opacity-20 rounded-2xl p-4 backdrop-blur-sm border border-white border-opacity-30">
                        <h5 className="font-bold text-sm uppercase tracking-wider mb-2">🎯 Найденный маршрут</h5>
                        <p className="text-sm leading-relaxed font-semibold">{selectedDriver.route}</p>
                      </div>
                    )}

                    <button className="w-full bg-white text-purple-600 py-3 px-6 rounded-2xl font-bold hover:bg-opacity-90 transition-all duration-200 transform hover:scale-105">
                      💬 Связаться с водителем
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                      <MapPin className="w-8 h-8" />
                    </div>
                    <p className="text-lg text-white text-opacity-80 mb-4">Выберите водителя</p>
                    <p className="text-sm text-white text-opacity-60">для просмотра подробной информации</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarrierFinderApp;