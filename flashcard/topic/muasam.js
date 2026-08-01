window.TOPIC_NAME = "Từ vựng về mua sắm";

const rawData = `
Customer - Khách hàng
Cashier - Nhân viên thu ngân
Attendant - Người phục vụ
Manager - Giám đốc, quản lý
Wallet - Ví tiền
Purse - Ví tiền (nữ)
Scale - Cái cân
Counter - Quầy hàng
Barcode reader - Máy đọc mã vạch
Receipt - Biên lai
Pay - Trả tiền
Expensive - Đắt
Cheap - Rẻ
Discount - Giảm giá
Sell - Bán
Price - Giá cả
Trolley - Xe đẩy
Credit card - Thẻ tín dụng
Cash - Tiền mặt
Shop - Cửa hàng
Money - Tiền
Basket - Rổ, giỏ
Bag - Túi
Buy - Mua
Greengrocer - Cửa hàng bán rau quả
Housewares - Đồ gia dụng
Toy store - Cửa hàng đồ chơi
Shopping mall - Trung tâm mua sắm
Grocery store - Cửa hàng tạp hóa
Convenience store - Cửa hàng tiện lợi
Bargain - Mặc cả
Refund - Hoàn lại, trả lại
Brochure - Tập quảng cáo
Liquor store - Quán rượu
Drugstore - Tiệm thuốc
Candy store - Cửa hàng kẹo
Gift shop - Cửa hàng đồ lưu niệm
Pet shop - Tiệm thú cưng
Shoe shop - Tiệm giày
Meat shop - Cửa hàng thịt
Florist - Người bán hoa
Butcher - Người bán thịt
`;

const cards = rawData
  .trim()
  .split("\n")
  .map((line, index) => {
    if (!line.includes(" - ")) return null;

    const [front, back] = line.split(" - ");

    return {
      id: index + 1,
      front: front.trim(),
      back: back.trim()
    };
  })
  .filter(card => card && card.front && card.back);
