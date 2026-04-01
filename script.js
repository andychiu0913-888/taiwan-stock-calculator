// 常數定義
const BASE_FEE_RATE = 0.001425; // 0.1425% 手續費率
const TAX_RATE = 0.0015;        // 0.15% 當沖交易稅率

// 試算百分比列表 (如 Excel 所示)
const PERCENTAGES_UP = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const PERCENTAGES_DOWN = [-0.5, -1, -1.5, -2, -2.5, -3, -3.5, -4, -4.5, -5, -5.5, -6, -6.5, -7, -7.5, -8, -8.5, -9, -9.5, -10];

let currentMode = 'UP'; // UP or DOWN
let tradeType = 'LONG';  // LONG or SHORT

// 取得 DOM 元素
const priceInput = document.getElementById('price');
const quantityInput = document.getElementById('quantity');
const discountInput = document.getElementById('discount');
const tableBody = document.getElementById('table-body');
const buyingCostEl = document.getElementById('buying-cost');
const breakEvenEl = document.getElementById('break-even');
const minTickProfitEl = document.getElementById('min-tick-profit');
const modeUpBtn = document.getElementById('mode-up');
const modeDownBtn = document.getElementById('mode-down');
const typeLongBtn = document.getElementById('type-long');
const typeShortBtn = document.getElementById('type-short');
const priceLabel = document.getElementById('price-label');
const balanceLabel = document.getElementById('summary-balance-label');

// 初始化
init();

function init() {
    [priceInput, quantityInput, discountInput].forEach(input => {
        input.addEventListener('input', calculate);
    });

    modeUpBtn.addEventListener('click', () => {
        currentMode = 'UP';
        updateModeUI();
        calculate();
    });

    modeDownBtn.addEventListener('click', () => {
        currentMode = 'DOWN';
        updateModeUI();
        calculate();
    });

    typeLongBtn.addEventListener('click', () => {
        tradeType = 'LONG';
        updateTradeTypeUI();
        calculate();
    });

    typeShortBtn.addEventListener('click', () => {
        tradeType = 'SHORT';
        updateTradeTypeUI();
        calculate();
    });

    calculate();
}

function updateModeUI() {
    modeUpBtn.classList.toggle('active', currentMode === 'UP');
    modeDownBtn.classList.toggle('active', currentMode === 'DOWN');
}

function updateTradeTypeUI() {
    typeLongBtn.classList.toggle('active', tradeType === 'LONG');
    typeShortBtn.classList.toggle('active', tradeType === 'SHORT');
    
    if (tradeType === 'LONG') {
        priceLabel.textContent = '買入成交價 (TWD)';
        balanceLabel.textContent = '買入成本 (含手續費)';
    } else {
        priceLabel.textContent = '賣出成交價 (TWD)';
        balanceLabel.textContent = '賣出成本 (含手續費)';
    }
}

// 根據價格判斷跳動單位 (Tick Size)
function getTickSize(price) {
    if (price < 10) return 0.01;
    if (price < 50) return 0.05;
    if (price < 100) return 0.1;
    if (price < 500) return 0.5;
    if (price < 1000) return 1;
    return 5;
}

// 根據跳動單位校正價格到有效的交易價
function roundToTick(price) {
    const tickSize = getTickSize(price);
    return Math.round(price / tickSize) * tickSize;
}

function formatCurrency(val) {
    return new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: 'TWD',
        maximumFractionDigits: 0
    }).format(val);
}

function formatPrice(price) {
    // 手動格式化：確保千分位逗號，並徹底移除無效的尾隨零與小數點
    // 例如 100435.00 -> 100,435 | 100.50 -> 100.5 | 10.05 -> 10.05
    const rounded = Math.round(price * 100) / 100;
    const parts = rounded.toFixed(2).split('.');
    const integerPart = parseInt(parts[0]).toLocaleString('zh-TW');
    const decimalPart = parts[1].replace(/0+$/, '');
    return decimalPart.length > 0 ? `${integerPart}.${decimalPart}` : integerPart;
}

function calculate() {
    const entryPrice = parseFloat(priceInput.value) || 0;
    const qty = parseFloat(quantityInput.value) || 0;
    const discount = (parseFloat(discountInput.value) || 2.8) / 10;
    const shares = qty * 1000;

    if (entryPrice <= 0 || qty <= 0) return;

    let balanceValue = 0;
    let breakEvenPrice = 0;

    if (tradeType === 'LONG') {
        const buySubtotal = entryPrice * shares;
        const buyFee = Math.floor(buySubtotal * BASE_FEE_RATE * discount);
        balanceValue = buySubtotal + buyFee;
        
        const beRaw = balanceValue / (shares * (1 - BASE_FEE_RATE * discount - TAX_RATE));
        breakEvenPrice = roundToTick(beRaw);
        if (calcProfit(entryPrice, breakEvenPrice, shares, discount) < 0) {
            breakEvenPrice = roundToTick(breakEvenPrice + getTickSize(breakEvenPrice));
        }
    } else {
        const sellSubtotal = entryPrice * shares;
        const sellFee = Math.floor(sellSubtotal * BASE_FEE_RATE * discount);
        const tax = Math.floor(sellSubtotal * TAX_RATE);
        // 賣出成本 = 賣出金額 + 手續費（與買入成本對稱）
        balanceValue = sellSubtotal + sellFee;
        // 損益兩平計算使用淨收入（含交易稅扣除）
        const netSellProceeds = sellSubtotal - sellFee - tax;
        const beRaw = netSellProceeds / (shares * (1 + BASE_FEE_RATE * discount));
        breakEvenPrice = roundToTick(beRaw);
        if (calcProfit(breakEvenPrice, entryPrice, shares, discount) < 0) {
            breakEvenPrice = roundToTick(breakEvenPrice - getTickSize(breakEvenPrice));
        }
    }

    buyingCostEl.textContent = formatCurrency(balanceValue);
    breakEvenEl.textContent = `NT$ ${formatPrice(breakEvenPrice)}`;

    const tick = getTickSize(entryPrice);
    let tickProfit = 0;
    if (tradeType === 'LONG') {
        tickProfit = calcProfit(entryPrice, roundToTick(entryPrice + tick), shares, discount);
    } else {
        tickProfit = calcProfit(roundToTick(entryPrice - tick), entryPrice, shares, discount);
    }
    minTickProfitEl.textContent = formatCurrency(tickProfit);
    minTickProfitEl.className = 'value ' + (tickProfit >= 0 ? 'profit' : 'loss');

    renderTable(entryPrice, shares, discount);
}

function calcProfit(buyPrice, sellPrice, shares, discount) {
    const buySub = buyPrice * shares;
    const buyFee = Math.floor(buySub * BASE_FEE_RATE * discount);
    const sellSub = sellPrice * shares;
    const sellFee = Math.floor(sellSub * BASE_FEE_RATE * discount);
    const tax = Math.floor(sellSub * TAX_RATE);
    return sellSub - sellFee - tax - (buySub + buyFee);
}

function renderTable(entryPrice, shares, discount) {
    tableBody.innerHTML = '';
    const ratios = (currentMode === 'UP' ? PERCENTAGES_UP : PERCENTAGES_DOWN);
    
    ratios.forEach(ratio => {
        let buyP, sellP;
        if (tradeType === 'LONG') {
            buyP = entryPrice;
            sellP = roundToTick(buyP * (1 + ratio / 100));
        } else {
            sellP = entryPrice;
            buyP = roundToTick(sellP * (1 - ratio / 100));
        }

        const profit = calcProfit(buyP, sellP, shares, discount);
        const revenue = (tradeType === 'LONG' ? sellP : buyP) * shares;
        const costBasis = (tradeType === 'LONG' ? buyP : sellP) * shares;
        const totalCost = costBasis + Math.floor(costBasis * BASE_FEE_RATE * discount);
        const roi = (profit / totalCost) * 100;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ratio > 0 ? '+' : ''}${ratio}%</td>
            <td>${formatPrice(tradeType === 'LONG' ? sellP : buyP)}</td>
            <td>${formatCurrency(revenue)}</td>
            <td class="${profit >= 0 ? 'profit' : 'loss'}">${formatCurrency(profit)}</td>
            <td class="${roi >= 0 ? 'profit' : 'loss'}">${roi.toFixed(2)}%</td>
        `;
        tableBody.appendChild(tr);
    });
}
