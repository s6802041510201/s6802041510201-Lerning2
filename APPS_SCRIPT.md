# Google Apps Script Setup Guide

ไฟล์นี้ประกอบด้วยโค้ด **Google Apps Script** และคำแนะนำในการเชื่อมต่อระบบกับ **Google Sheets** เพื่อจัดเก็บข้อมูลความก้าวหน้าและคะแนนประเมินผลของผู้เรียนรายบุคคล (Pre-test / Post-test / Game) อย่างเรียบร้อยและปลอดภัย

---

## 📄 โค้ดสำหรับ Google Apps Script (`Code.gs`)

ให้นำโค้ดด้านล่างนี้ไปวางในระบบ Apps Script ของท่าน:

```javascript
/**
 * ระบบรับข้อมูลคะแนนและประวัติผู้เรียนจาก Web Application
 * พัฒนาขึ้นสำหรับรายวิชา 21910-2001 ระบบปฏิบัติการคอมพิวเตอร์ (ปวช.)
 */

function doPost(e) {
  var response = {
    status: "error",
    message: "No data received"
  };
  
  try {
    // ดึงและแปลงข้อมูล JSON ที่ส่งมาจากแอปพลิเคชัน
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    
    if (data && data.action === "save") {
      // ใช้ ID สเปรดชีตที่ส่งมา หรือใช้ไอดีเริ่มต้นหลัก
      var spreadsheetId = data.id || "18I4yFbzkqGQNkdnKF_pU7kRadEsEq0E5ucaRQ86K2Ko";
      var ss = SpreadsheetApp.openById(spreadsheetId);
      var sheet = ss.getSheets()[0]; // เลือกชีตแท็บแรก (Sheet1)
      
      // สร้างแถวหัวตาราง (Headers) อัตโนมัติหากพบว่าชีตว่างเปล่า
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          "วันที่-เวลา", 
          "ชื่อ-นามสกุล", 
          "คะแนนก่อนเรียน (Pre-test)", 
          "คะแนนหลังเรียน (Post-test)", 
          "สถานะการเรียนรู้", 
          "ความก้าวหน้า/พัฒนาการ",
          "เวลาเข้าเรียนล่าสุด",
          "เวลาออกจากบทเรียน",
          "เวลาเรียนสะสม (วินาที)"
        ]);
        
        // ตกแต่งหัวตารางให้อ่านง่ายและสวยงาม
        sheet.getRange(1, 1, 1, 9)
             .setBackground("#16a34a") // สีเขียวสวยงามธีมห้องเรียน
             .setFontColor("#ffffff")
             .setFontWeight("bold")
             .setHorizontalAlignment("center");
      }
      
      var rows = sheet.getDataRange().getValues();
      var studentName = data.name;
      var foundIndex = -1;
      
      // ค้นหาข้อมูลเดิมของนักศึกษาเพื่อหลีกเลี่ยงรายชื่อซ้ำซ้อน (เริ่มค้นหาจากแถวที่ 2)
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][1] === studentName) {
          foundIndex = i + 1; // ดึงดัชนี 1-based ของชีต
          break;
        }
      }
      
      // เตรียมชุดข้อมูลสำหรับบันทึก
      var timestamp = data.timestamp;
      var preScore = data.preTestScore;
      var postScore = data.postTestScore;
      var status = data.status;
      var improvement = data.improvement;
      var loginTime = data.loginTime || "";
      var logoutTime = data.logoutTime || "";
      var totalStudyTime = data.totalStudyTime || 0;
      
      if (foundIndex !== -1) {
        // กรณีพบข้อมูลเก่า: อัปเดตข้อมูลบนแถวเดิมเพื่อความสะอาดของข้อมูล
        sheet.getRange(foundIndex, 1).setValue(timestamp); // อัปเดตเวลารีเฟรชล่าสุด
        
        // อัปเดตคะแนนก่อนเรียน (ถ้ามีค่าส่งมาใหม่และไม่ใช่ -1)
        if (preScore >= 0) {
          sheet.getRange(foundIndex, 3).setValue(preScore);
        }
        
        // อัปเดตคะแนนหลังเรียน
        if (postScore >= 0) {
          sheet.getRange(foundIndex, 4).setValue(postScore);
        }
        
        sheet.getRange(foundIndex, 5).setValue(status);
        sheet.getRange(foundIndex, 6).setValue(improvement);
        
        // บันทึกเวลาเพิ่มเติม
        if (loginTime) {
          sheet.getRange(foundIndex, 7).setValue(loginTime);
        }
        if (logoutTime) {
          sheet.getRange(foundIndex, 8).setValue(logoutTime);
        }
        if (totalStudyTime >= 0) {
          sheet.getRange(foundIndex, 9).setValue(totalStudyTime);
        }
        
        response = {
          status: "success",
          message: "อัปเดตข้อมูลของ " + studentName + " บน Google Sheets สำเร็จเรียบร้อยแล้ว!"
        };
      } else {
        // กรณีไม่พบข้อมูลเดิม: เพิ่มแถวข้อมูลผู้เรียนคนใหม่
        var displayPre = (preScore >= 0) ? preScore : "-";
        var displayPost = (postScore >= 0) ? postScore : "-";
        
        sheet.appendRow([
          timestamp,
          studentName,
          displayPre,
          displayPost,
          status,
          improvement,
          loginTime,
          logoutTime,
          totalStudyTime
        ]);
        
        response = {
          status: "success",
          message: "บันทึกข้อมูลนักเรียนใหม่ " + studentName + " ลง Google Sheets สำเร็จ!"
        };
      }
    } else {
      response.message = "การกระทำ (Action) ไม่ถูกต้อง หรือข้อมูลผิดพลาด";
    }
    
  } catch (err) {
    response = {
      status: "error",
      message: "เกิดข้อผิดพลาดในการรันสคริปต์: " + err.toString()
    };
  }
  
  // ส่งค่าผลลัพธ์กลับในรูปแบบ JSON พร้อมเปิด CORS
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "เซิร์ฟเวอร์ระบบ Google Apps Script สำหรับรายวิชา 21910-2001 เปิดใช้งานอยู่เป็นปกติ!"
  })).setMimeType(ContentService.MimeType.JSON);
}
```

---

## 🛠️ ขั้นตอนการติดตั้งและเชื่อมโยงระบบ (Step-by-Step Setup)

### ขั้นตอนที่ 1: เตรียม Google Sheet ของคุณ
1. ไปที่ [Google Sheets](https://sheets.google.com) แล้วสร้างสเปรดชีตเปล่าขึ้นมาใหม่
2. สังเกตแถบลิงก์ (URL) ของชีต ตัวอย่างเช่น:
   `https://docs.google.com/spreadsheets/d/18I4yFbzkqGQNkdnKF_pU7kRadEsEq0E5ucaRQ86K2Ko/edit`
   *รหัสยาว ๆ ตรงกลาง (เช่น `18I4yFbzkqGQNkdnKF_pU7kRadEsEq0E5ucaRQ86K2Ko`) คือ **Spreadsheet ID** ของคุณ*
3. คุณไม่ต้องสร้างหัวข้อคอลัมน์เอง สคริปต์ด้านบนจะทำการจัดทำและตกแต่งสเปรดชีตให้โดยอัตโนมัติในการบันทึกครั้งแรก!

### ขั้นตอนที่ 2: ฝังโค้ดใน Google Apps Script
1. ที่หน้าสเปรดชีตของคุณ ไปที่เมนูด้านบน คลิก **ส่วนขยาย (Extensions)** -> **Apps Script**
2. ลบโค้ดเริ่มต้นที่ระบบให้มาทั้งหมดออก
3. คัดลอกโค้ดจากหัวข้อ **Code.gs** ด้านบนทั้งหมดไปวางในหน้าต่างแก้ไขโค้ด
4. กดไอคอน **บันทึกโครงการ (Save Project)** (รูปแผ่นดิสก์) ด้านบน

### ขั้นตอนที่ 3: เปิดใช้งานเป็นเว็บแอปพลิเคชัน (Deployment)
1. คลิกปุ่ม **การทำให้ใช้งานได้ (Deploy)** ที่มุมขวาบน -> เลือก **การจัดการทำให้ใช้งานได้ใหม่ (New deployment)**
2. คลิกไอคอนฟันเฟือง เลือกประเภทเป็น **เว็บแอป (Web app)**
3. ตั้งค่าการกำหนดค่าดังนี้:
   * **คำอธิบาย (Description):** `ระบบเก็บบันทึกคะแนนวิชาฮาร์ดแวร์ ปวช.`
   * **เรียกใช้ในฐานะ (Execute as):** เลือก **ฉัน (อีเมลของคุณ)**
   * **ผู้ที่มีสิทธิ์เข้าถึง (Who has access):** เลือก **ทุกคน (Anyone)** *(สำคัญมาก! เพื่อให้แอปจากภายนอกสามารถส่งคะแนนมาได้)*
4. คลิกปุ่ม **การทำให้ใช้งานได้ (Deploy)**
5. ระบบของ Google อาจขอสิทธิ์ความปลอดภัย ให้คลิก **ให้สิทธิ์เข้าถึง (Authorize Access)** -> เลือกบัญชีอีเมลของคุณ -> คลิก **ขั้นสูง (Advanced)** -> เลือก **ไปที่โครงการที่ไม่ได้ตั้งชื่อ (ความปลอดภัยต่ำ)** -> กด **อนุญาต (Allow)**
6. เมื่อ Deploy สำเร็จ ระบบจะมอบ **URL ของเว็บแอป (Web app URL)** ที่ลงท้ายด้วย `/exec` มาให้
7. ให้คัดลอกลิงก์ `/exec` นั้น เพื่อนำไปอัปเดตลงในแอปพลิเคชันของคุณทันที!
