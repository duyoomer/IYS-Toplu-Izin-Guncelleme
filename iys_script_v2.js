// Fonksiyonun override edilmemiş orjinal halini tutar.
var originalSetRequestHeader;

// Web api'ye request göndermek için gerekli olan authorization bilgisi.
var auth;

// Script ana fonksiyonu.
async function iysV2() {

  // IYS sayfasında değilse script'i bitir.
  if (window.location.origin != "https://vatandas.iys.org.tr") {
    return console.log("IYS Vatandaş sayfasında giriş yapıp script'i tekrar çalıştırın.");
  }

  let userChoice;

  do {
    userChoice = prompt("İzinlerin durumunu değiştirmek için 'RET' ya da 'ONAY' yazın:").toUpperCase();
    
    // Geçersiz bir seçim olup olmadığını kontrol et.
    if (userChoice !== "RET" && userChoice !== "ONAY") {
      alert("Geçersiz seçim! Lütfen 'RET' ya da 'ONAY' yazın.");
    }
  } while (userChoice !== "RET" && userChoice !== "ONAY");
  
  // Seçimi newStatus'e ata.
  let newStatus = userChoice;

  // Sayfanın kendi script'i, marka listesini vs çekmek için web server'a request gönderiyor.
  // Request'i göndermeden önce setRequestHeader() fonksiyonu ile header parametrelerini veriyor.
  // Bu fonksiyonu override ederek header parametrelerinden Authorization'ı yakalıyoruz.
  if (!originalSetRequestHeader) {
    // Orjinal fonksiyonu değişkene kaydet.
    originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    // Override fonksiyon.
    XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
      // Orjinal fonksiyonu çağır.
      originalSetRequestHeader.call(this, header, value);

      // Gelen Authorization parametresini kaydet.
      if (header == "Authorization" && (!auth || auth != value)) {
        auth = value;
        console.log("Authorization alındı.");
      }
    };
  }

  // Authorization bilgisi alınmamışsa, bir linke tıkla ve alınmasını bekle.
  // Linklere tıklanınca sayfa request gönderir ve böylece auth alınmış olur.
  if (!auth) {
    if (window.location.pathname == "/profil") {
      // Profil sayfasındaysa İzinlerim sayfasını aç.
      let izinlerButton = document.querySelector("div.flex.justify-between.items-center.col");
      izinlerButton.click();
    } else {
      // Başka bir sayfada ise Profil sayfasını aç.
      let profilButton = document.querySelector("a[href=\"/profil\"]");
      profilButton.click();
    }

    // Auth alınıncaya kadar bekle.
    console.log("Authorization bekleniyor.");
    while (!auth) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Alıcı bilgilerini iste. (Telefon numarası ve mail adresi)
  let recipientsResponse = await fetch("https://vatandas.iys.org.tr/api/v1/cgw/recipients/list", {
    "credentials": "include",
    "headers": {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.5",
      "Authorization": auth,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin"
    },
    "referrer": "https://vatandas.iys.org.tr/profil",
    "method": "GET",
    "mode": "cors"
  });

  // Server hata dönerse çık.
  if (!recipientsResponse.ok) {
    return console.log("HTTP-Error: " + recipientsResponse.status);
  }

  // Json olarak gelen alıcı bilgisini (telefon ve mail) javascript objesine çevir. 
  let recipientsObj = await recipientsResponse.json();

  // Script'in toplam kaç izni değiştirdiğini (RET veya ONAY) sayacak. 
  let successCount = 0;

  // Objede iki alıcı var. Telefon ve mail. Birden fazla telefon veya mail olabileceği için for'la yazıldı.
  for (let i = 0; i < recipientsObj.communicationAddress.length; i++) {

    // Marka listesi 100'er 100'er sorgulanabiliyor.
    let offset = 0;
    let totalCount = 1;

    // 100'lük listeler birleştirilerek oluşturulacak olan ana liste.
    let brandsList = [];

    while (offset < totalCount) {
      // 100'lük marka listesini al.
      let brandsResponse = await fetch("https://vatandas.iys.org.tr/api/v1/cgw/recipients/BIREYSEL/brands/search/?text=&offset=" + offset + "&limit=100", {
        "credentials": "include",
        "headers": {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.5",
          "Content-Type": "application/json",
          "Authorization": auth,
          "Sec-GPC": "1",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin"
        },
        "referrer": "https://vatandas.iys.org.tr/izinlerim",
        "body": JSON.stringify({
          recipient: recipientsObj.communicationAddress[i].recipient
        }),
        "method": "POST",
        "mode": "cors"
      });

      // Server hata dönerse çık.
      if (!brandsResponse.ok) {
        return console.log("HTTP-Error: " + brandsResponse.status);
      }

      // Json olarak gelen marka listesini javascript objesine çevir. 
      let brandsObj = await brandsResponse.json();

      // Gelen 100'lük marka listesini ana listeye ekle.
      brandsList.push(...brandsObj.list);

      // Offset 0, 100, 200, 300 şeklinde geliyor.
      // Bir sonraki sorguda kullanmak için gelen offset değerine 100 ekle.
      offset = brandsObj.pagination.offset + 100;
      totalCount = brandsObj.pagination.totalCount;
    } // end of while

    console.log("\"" + recipientsObj.communicationAddress[i].type + ": " + recipientsObj.communicationAddress[i].recipient + "\" alıcısı için " + brandsList.length + " tane izin var.");

    // Marka listesinde gez ve ONAY olan markalar için RET komutu gönder.
    for (let j = 0; j < brandsList.length; j++) {

      if (brandsList[j].status != newStatus) {

        // RET komutu gönder.
        let updateResponse = await fetch("https://vatandas.iys.org.tr/api/v1/cgw/recipients/BIREYSEL/brands/" + brandsList[j].brandCode + "/consent/update", {
          "credentials": "include",
          "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/json",
            "Authorization": auth,
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin"
          },
          "referrer": "https://vatandas.iys.org.tr/izinlerim/onay-ret",
          "body": JSON.stringify({
            recipient: recipientsObj.communicationAddress[i].recipient,
            status: newStatus,
            type: brandsList[j].type
          }),
          "method": "POST",
          "mode": "cors"
        });

        // Server hata dönerse çık.
        if (!updateResponse.ok) {
          return console.log("HTTP-Error: " + updateResponse.status);
        }

        // Sıra numarasını ve marka adının ilk iki kelimesini konsola yazdır.
        console.log((j + 1) + "/" + brandsList.length + ": " + brandsList[j].brandName.split(' ').slice(0, 2).join(' ') + " " + brandsList[j].type.toLowerCase() + " izni " + newStatus + " yapıldı.");

        successCount++;
      }
    } // end of for
  } // end of for

  // Başka bir sayfada ise Profil sayfasına dön.
  let profilButton = document.querySelector("a[href=\"/profil\"]");
  if (profilButton) {
    profilButton.click();
  }

  return console.log("Toplam " + successCount + " izin " + newStatus + " yapıldı.");
} // end of func


// Script'i başlat.
(async () => {
  console.log("Script başladı.");
  await iysV2();
  console.log("Script bitti.");
})();

console.log(" ");