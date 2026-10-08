// 1. Supabase 대시보드의 프로젝트 URL과 공개 키를 직접 입력해주세요.
const SUPABASE_URL = 'https://lahrbkcafllikxmecain.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhaHJia2NhZmxsaWt4bWVjYWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTU1NjAsImV4cCI6MjEwNjk3MTU2MH0.AjsxTFfEHhviycNPHfdm4aKXNsCM4zjZsdtete-Dn70';

// 2. 본인의 Supabase 테이블 이름
const TABLE_NAME = 'vibe_cafe_orders';

// 3. CDN으로 불러온 Supabase 도구를 사용해 데이터베이스에 연결합니다.
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ===================================================
// 바이브 카페 (Vibe Cafe) 주문서 및 주문 내역 스크립트
// ===================================================

// 1. 주문 내역을 저장할 전역 데이터
const orders = [];         // 접수된 주문 객체들을 담을 배열 (최신 주문이 앞쪽에 저장됨)
let nextOrderNumber = 1;   // 주문 번호 카운터 (#1, #2, ...)

// 2. HTML 주요 요소 가져오기 (DOM 선택)
// 탭 관련 요소
const tabOrderBtn = document.getElementById('tab-order');       // '주문하기' 탭 버튼
const tabHistoryBtn = document.getElementById('tab-history');   // '주문 내역' 탭 버튼
const orderBadge = document.getElementById('order-badge');       // 주문 내역 건수 뱃지
const orderSection = document.getElementById('order-section');   // 주문하기 화면 섹션
const historySection = document.getElementById('history-section'); // 주문 내역 화면 섹션

// 주문서 관련 요소
const orderForm = document.getElementById('order-form');             // 주문서 폼 전체
const customerNameInput = document.getElementById('customer-name'); // 고객 이름 입력칸
const customerPhoneInput = document.getElementById('customer-phone'); // 고객 전화번호 입력칸
const drinkSelect = document.getElementById('drink-select');         // 음료 선택 드롭다운
const quantityInput = document.getElementById('quantity');           // 수량 입력칸
const requestsInput = document.getElementById('requests');           // 요청사항 입력칸
const estimatedPriceArea = document.getElementById('estimated-price-area'); // 예상 금액 표시 영역
const orderConfirmation = document.getElementById('order-confirmation');   // 주문 확인 메시지 영역
const sizeRadios = document.querySelectorAll('input[name="size"]'); // 사이즈 라디오 버튼들
const optionCheckboxes = document.querySelectorAll('input[name="options"]'); // 추가 옵션 체크박스들

// 주문 내역 목록 및 통계 요소
const ordersList = document.getElementById('orders-list');             // 주문 카드 목록이 들어갈 컨테이너
const historySummary = document.getElementById('history-summary');     // 하단 통계/삭제 영역
const totalSummaryText = document.getElementById('total-summary-text'); // 총 금액 및 건수 텍스트
const clearHistoryBtn = document.getElementById('clear-history-btn');   // '내역 모두 지우기' 버튼


// ===================================================
// 3. 탭 메뉴 전환 기능
// ===================================================

/**
 * '주문하기' 탭을 활성화하는 함수
 */
function showOrderTab() {
  tabOrderBtn.classList.add('active');
  tabHistoryBtn.classList.remove('active');

  orderSection.classList.remove('hidden');
  historySection.classList.add('hidden');
}

/**
 * '주문 내역' 탭을 활성화하는 함수
 */
function showHistoryTab() {
  tabHistoryBtn.classList.add('active');
  tabOrderBtn.classList.remove('active');

  historySection.classList.remove('hidden');
  orderSection.classList.add('hidden');

  // 주문 내역 탭을 열 때 목록을 새로 그립니다.
  renderOrders();
}

tabOrderBtn.addEventListener('click', showOrderTab);
tabHistoryBtn.addEventListener('click', showHistoryTab);


// ===================================================
// 4. 예상 금액 계산 함수 (calculateTotal)
// ===================================================

/**
 * 실시간으로 주문 예상 금액을 계산하고 화면에 반영하는 함수
 * @returns {number} 총 계산 금액
 */
function calculateTotal() {
  // (1) 선택된 음료 가격 확인
  const selectedOption = drinkSelect.options[drinkSelect.selectedIndex];
  const drinkPrice = Number(selectedOption.dataset.price) || 0;

  // 음료를 선택하지 않았다면 예상 금액은 0원
  if (!drinkSelect.value || drinkPrice === 0) {
    updatePriceDisplay(0);
    return 0;
  }

  // (2) 선택된 사이즈 추가 금액
  const selectedSize = document.querySelector('input[name="size"]:checked');
  const sizePrice = selectedSize ? (Number(selectedSize.dataset.price) || 0) : 0;

  // (3) 선택된 추가 옵션 합산 금액
  let optionsPrice = 0;
  const checkedOptions = document.querySelectorAll('input[name="options"]:checked');
  checkedOptions.forEach(option => {
    optionsPrice += Number(option.dataset.price) || 0;
  });

  // (4) 수량 (기본값 1)
  let quantity = parseInt(quantityInput.value, 10);
  if (isNaN(quantity) || quantity < 1) {
    quantity = 1;
  }

  // (5) 총 금액 = (음료 + 사이즈 + 옵션) × 수량
  const singleCupPrice = drinkPrice + sizePrice + optionsPrice;
  const totalPrice = singleCupPrice * quantity;

  // (6) 금액 표시 업데이트
  updatePriceDisplay(totalPrice);

  return totalPrice;
}

/**
 * 예상 금액 표시 영역 텍스트 업데이트
 * @param {number} price
 */
function updatePriceDisplay(price) {
  estimatedPriceArea.textContent = `예상 금액: ${price.toLocaleString()}원`;
}

// 음료, 사이즈, 옵션, 수량이 바뀔 때마다 실시간 계산 실행
drinkSelect.addEventListener('change', calculateTotal);
sizeRadios.forEach(radio => radio.addEventListener('change', calculateTotal));
optionCheckboxes.forEach(checkbox => checkbox.addEventListener('change', calculateTotal));
quantityInput.addEventListener('input', calculateTotal);
quantityInput.addEventListener('change', calculateTotal);


// ===================================================
// 5. 주문 내역 렌더링 함수 (renderOrders)
// - orders 배열의 내용을 읽어 화면에 표시합니다.
// - XSS 보안을 위해 모든 텍스트는 innerHTML 대신 textContent를 사용합니다.
// ===================================================

function renderOrders() {
  // (1) 뱃지의 주문 건수 숫자 업데이트
  orderBadge.textContent = orders.length;

  // (2) 기존 카드 목록 비우기
  ordersList.textContent = '';

  // (3) 주문 내역이 하나도 없는 경우
  if (orders.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-orders';
    emptyMessage.textContent = '아직 주문 내역이 없어요 ☕';
    ordersList.appendChild(emptyMessage);

    // 하단 요약 영역 숨기기
    historySummary.classList.add('hidden');
    return;
  }

  // (4) 주문 내역이 있는 경우 하단 요약 영역 보이기
  historySummary.classList.remove('hidden');

  // (5) orders 배열 순회하며 주문 카드 동적 생성 (최신 주문부터 순서대로)
  orders.forEach((order, index) => {
    // 카드 전체 래퍼 생성
    const card = document.createElement('div');
    card.className = 'order-card';

    // [1줄] 헤더: 주문번호/이름/금액 + 취소 버튼
    const cardHeader = document.createElement('div');
    cardHeader.className = 'order-card-header';

    const cardTitle = document.createElement('div');
    cardTitle.className = 'order-card-title';
    cardTitle.textContent = `#${order.orderNumber} ${order.name}님 · ${order.totalPrice.toLocaleString()}원`;

    // 취소 버튼
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'order-cancel-btn';
    cancelBtn.textContent = '취소';

    // 취소 버튼 클릭 이벤트 (confirm 창으로 확인 후 삭제)
    cancelBtn.addEventListener('click', function () {
      const confirmDelete = confirm(`#${order.orderNumber}번 (${order.name}님) 주문을 취소하시겠습니까?`);
      if (confirmDelete) {
        // 해당 주문을 배열에서 제거
        orders.splice(index, 1);
        // 목록 다시 그리기
        renderOrders();
      }
    });

    cardHeader.appendChild(cardTitle);
    cardHeader.appendChild(cancelBtn);

    // [2줄] 음료 상세 정보
    const cardBody = document.createElement('div');
    cardBody.className = 'order-card-body';
    // 예: "카페라떼 M사이즈 (샷 추가) 1잔"
    cardBody.textContent = `${order.drink} ${order.size}사이즈${order.optionString} ${order.quantity}잔`;

    // [3줄] 요청사항 및 주문 시간
    const cardFooter = document.createElement('div');
    cardFooter.className = 'order-card-footer';
    if (order.requests && order.requests.trim() !== '') {
      cardFooter.textContent = `요청: ${order.requests} · ${order.orderTime}`;
    } else {
      cardFooter.textContent = `${order.orderTime}`;
    }

    // 카드에 요소들 조립
    card.appendChild(cardHeader);
    card.appendChild(cardBody);
    card.appendChild(cardFooter);

    // 컨테이너에 카드 추가
    ordersList.appendChild(card);
  });

  // (6) 하단 총 주문 금액 및 건수 계산하여 표시
  const totalAmount = orders.reduce((sum, item) => sum + item.totalPrice, 0);
  totalSummaryText.textContent = `총 주문 금액: ${totalAmount.toLocaleString()}원 (${orders.length}건)`;
}


// ===================================================
// 6. 주문하기 (Submit) 이벤트 처리
// ===================================================

orderForm.addEventListener('submit', async function (event) {
  event.preventDefault();

  // (1) 이름 유효성 검사
  const customerName = customerNameInput.value.trim();
  if (customerName === '') {
    alert('이름을 입력해주세요');
    customerNameInput.focus();
    return;
  }

  // (2) 음료 선택 유효성 검사
  if (drinkSelect.value === '') {
    alert('음료를 선택해주세요');
    drinkSelect.focus();
    return;
  }

  // (3) 주문 상세 정보 추출
  const selectedDrinkOption = drinkSelect.options[drinkSelect.selectedIndex];
  const drinkName = selectedDrinkOption.textContent.split('(')[0].trim();
  const drinkPrice = Number(selectedDrinkOption.dataset.price) || 0;

  const selectedSizeRadio = document.querySelector('input[name="size"]:checked');
  const sizeName = selectedSizeRadio ? selectedSizeRadio.value : 'M';

  // 옵션 정보 추출
  const selectedOptions = document.querySelectorAll('input[name="options"]:checked');
  const optionNames = [];
  const optionValues = [];
  selectedOptions.forEach(option => {
    optionValues.push(option.value);
    const label = document.querySelector(`label[for="${option.id}"]`);
    if (label) {
      optionNames.push(label.textContent.split('(')[0].trim());
    }
  });
  const optionString = optionNames.length > 0 ? ` (${optionNames.join(', ')})` : '';

  const quantity = parseInt(quantityInput.value, 10) || 1;
  const requests = requestsInput.value.trim();
  const totalPrice = calculateTotal();

  // 현재 시간 포맷팅 (예: "오전 10:38" 또는 "10:38")
  const now = new Date();
  const orderTime = now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // 버튼을 비활성화하여 중복 클릭 방지
  const submitButton = document.getElementById('submit-btn');
  const originalButtonText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = '주문 처리 중...';

  try {
    // SUPABASE_URL과 SUPABASE_KEY가 아직 설정되지 않은 경우 알림
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_KEY === 'YOUR_SUPABASE_KEY') {
      console.warn('Supabase URL 또는 Key가 설정되지 않았습니다. script.js 상단에 값을 입력해주세요.');
      alert('주문 저장에 실패했어요\n(Supabase URL과 Key를 script.js 상단에 먼저 입력해주세요)');
      return;
    }

    // 주문 정보를 Supabase 테이블에 저장합니다.
    const { data, error } = await supabaseClient
      .from(TABLE_NAME)
      .insert({
        customer_name: customerName,
        phone: customerPhoneInput.value.trim(),
        drink: drinkName,
        drink_price: drinkPrice,
        size: sizeName,
        options: optionNames, // 한글 옵션 배열 (예: ['샷 추가', '시럽 추가'])
        quantity: quantity,
        request: requests,     // 요청사항 컬럼명: request
        total_price: totalPrice
      });

    // Supabase에서 에러가 반환된 경우 예외 발생
    if (error) {
      throw error;
    }
  } catch (error) {
    // 저장 실패 시 콘솔에 상세 에러 출력 및 사용자 알림
    console.error('주문 저장 중 오류가 발생했습니다:', error);
    alert('주문 저장에 실패했어요');
    return; // 실패 시 주문 완료 처리 중단
  } finally {
    // 저장이 완료되거나 실패해도 버튼을 다시 활성화
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }

  // (4) orders 배열에 새 주문 객체 생성 및 맨 앞에 추가 (최신 주문이 위로 오도록 unshift)
  const newOrder = {
    orderNumber: nextOrderNumber++,
    name: customerName,
    drink: drinkName,
    size: sizeName,
    optionString: optionString,
    quantity: quantity,
    requests: requests,
    totalPrice: totalPrice,
    orderTime: orderTime
  };

  orders.unshift(newOrder);

  // 주문 내역 렌더링 및 뱃지 숫자 갱신
  renderOrders();

  // (5) 주문 확인 메시지 출력
  orderConfirmation.textContent = `${customerName}님, ${drinkName} ${sizeName}사이즈${optionString} ${quantity}잔, 총 ${totalPrice.toLocaleString()}원 주문이 접수되었습니다!`;
  orderConfirmation.classList.remove('hidden');

  // 확인 메시지로 부드럽게 스크롤
  orderConfirmation.scrollIntoView({ behavior: 'smooth' });
});


// ===================================================
// 7. 내역 모두 지우기 버튼 처리
// ===================================================

clearHistoryBtn.addEventListener('click', function () {
  if (orders.length === 0) return;

  const confirmAllDelete = confirm('주문 내역을 모두 지우시겠습니까?');
  if (confirmAllDelete) {
    orders.length = 0; // 배열 비우기
    renderOrders();    // 화면 새로고침
  }
});


// ===================================================
// 8. 다시 작성 (Reset) 버튼 처리
// - 주문서 입력 필드만 초기화하며, 주문 내역(orders)은 지우지 않습니다.
// ===================================================

orderForm.addEventListener('reset', function () {
  setTimeout(() => {
    // M 사이즈 기본 선택 복원
    const defaultSizeM = document.getElementById('size-m');
    if (defaultSizeM) {
      defaultSizeM.checked = true;
    }

    // 수량 1로 복원
    quantityInput.value = '1';

    // 예상 금액 0원 복원
    calculateTotal();

    // 주문 확인 메시지 숨김
    orderConfirmation.classList.add('hidden');
    orderConfirmation.textContent = '';
  }, 0);
});

// 페이지 첫 진입 시 초기 렌더링 실행
renderOrders();
