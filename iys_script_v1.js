// Fonksiyon tanımla.
async function iysScript() {

  // Script başlanıgıcı.
  console.log("Script başlıyor.");

  // 200 ms aralıkla konsola 3 2 1 yazdır.
  for (let i = 3; i >= 1; i--) {
    console.log(i + "...");
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Markaların olduğu tabloyu seç.
  let table = document.getElementsByClassName("q-table")[0];
  console.log(table.rows.length - 1 + " tane marka var.");

  for (let i = 1; i < table.rows.length; i++) {
    // Tablodaki sıradaki satıra bak.
    let row = table.rows[i];
    console.log(i + "/" + (table.rows.length - 1) + " nolu satıra bakılıyor.");

    // Her satırın ilk hücresi marka adı, ikinci hücresi Mesaj İzni, üçüncü hücresi Arama İzni.
    if ((row.cells[1] && row.cells[1].innerText.trim() == "ONAY") ||
      (row.cells[2] && row.cells[2].innerText.trim() == "ONAY")) {
      // Onaylı olan marka bulundu.
      console.log(row.cells[0].innerText + " onaylıymış.");

      // Marka adını mor yap ve 1 saniye bekle.
      row.cells[0].style.backgroundColor = "#E5CCFF";
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Satıra tıkla ve detay sayfası açılsın.
      row.click();

      // 1 saniye bekle sayfa açılsın.
      await new Promise(resolve => setTimeout(resolve, 1000));

      // ONAYlı olan checkbox'ların listesini getirir. (Mesaj izni ve Arama izni)
      let checkboxes = document.querySelectorAll("div[role=\"checkbox\"][aria-label=\"ONAY\"]");

      // ONAY olan checkbox'a tıkla ve yarım saniye bekle.
      for (let cb of checkboxes) {
        cb.click();
        console.log("RET yapıldı.");
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Kaydet butonunu bul ve tıkla.
      let kaydetButton = document.querySelectorAll("button[role=\"button\"][type=\"button\"]")[4];
      kaydetButton.click();
      console.log("KAYDET tuşuna basıldı.");

      // 5 saniye bekle.
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Tablo tekrar yüklenene kadar bekle. Tablo yüklenince satır sayısı 5'ten büyük oluyor.
      while (document.getElementsByClassName("q-table")[0].rows.length < 5) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Tabloyu tekrar değişkene kaydet çünkü tablo yenilendi.
      table = document.getElementsByClassName("q-table")[0];
    }
  }

  console.log("Script bitti.");
}


// Fonksiyonu başlat.
await iysScript();