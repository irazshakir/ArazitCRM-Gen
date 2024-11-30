<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->invoice_number }}</title>
    <style>
        body {
            font-family: 'Helvetica', Arial, sans-serif;
            margin: 0;
            padding: 30px;
            color: #333;
            line-height: 1.6;
            position: relative;
            min-height: 100vh;
        }
        .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 50px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        .company-info {
            float: left;
            width: 50%;
        }
        .company-details {
            margin-top: 15px;
            font-size: 13px;
            color: #555;
        }
        .company-details div {
            margin-bottom: 3px;
        }
        .invoice-info {
            float: right;
            width: 40%;
            text-align: right;
        }
        .logo {
            width: 60px;
            height: 60px;
            object-fit: contain;
            margin-bottom: 15px;
        }
        .invoice-title {
            font-size: 32px;
            color: #a92479;
            margin-bottom: 15px;
            font-weight: 600;
            letter-spacing: 1px;
        }
        .invoice-number {
            font-size: 15px;
            color: #666;
            margin-bottom: 5px;
        }
        .invoice-date {
            font-size: 15px;
            color: #666;
        }
        .bill-to {
            margin: 40px 0;
            clear: both;
        }
        .bill-to h3 {
            color: #333;
            font-size: 18px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        .bill-to div {
            font-size: 15px;
            color: #555;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
        }
        th {
            background-color: #f8f9fa;
            padding: 15px;
            text-align: left;
            border-bottom: 2px solid #dee2e6;
            font-size: 14px;
            font-weight: 600;
            color: #333;
        }
        td {
            padding: 15px;
            border-bottom: 1px solid #dee2e6;
            font-size: 14px;
            color: #444;
        }
        .amounts {
            margin: 30px 0;
            text-align: right;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
        }
        .amount-row {
            margin: 10px 0;
            font-size: 14px;
        }
        .amount-row strong {
            margin-right: 20px;
            color: #333;
        }
        .terms {
            margin: 50px 0;
            padding: 25px;
            background-color: #f8f9fa;
            border-radius: 8px;
            page-break-inside: avoid;
        }
        .terms h4 {
            color: #333;
            font-size: 16px;
            margin-bottom: 15px;
            font-weight: 600;
        }
        .terms ul {
            list-style-type: none;
            padding-left: 0;
            margin: 0;
        }
        .terms li {
            margin-bottom: 10px;
            font-size: 13px;
            color: #555;
            padding-left: 20px;
            position: relative;
        }
        .terms li:before {
            content: "•";
            position: absolute;
            left: 0;
            color: #a92479;
        }
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            color: #666;
            font-size: 11px;
            padding: 20px;
            border-top: 1px solid #eee;
            background-color: #fff;
        }
        .main-content {
            margin-bottom: 100px; /* Space for footer */
        }
    </style>
</head>
<body>
    <div class="main-content">
        <div class="header">
            <div class="company-info">
                <img src="{{ $company['logo'] }}" alt="Company Logo" class="logo">
                <div class="company-details">
                    <div style="font-size: 15px; font-weight: 500; color: #333;">{{ $company['name'] }}</div>
                    <div>{{ $company['address'] }}</div>
                    <div>Phone: {{ $company['phone'] }}</div>
                    <div>Email: {{ $company['email'] }}</div>
                </div>
            </div>
            <div class="invoice-info">
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-number">Invoice #: {{ $invoice->invoice_number }}</div>
                <div class="invoice-date">Date: {{ $invoice->created_at->format('d/m/Y') }}</div>
            </div>
        </div>

        <div class="bill-to">
            <h3>Bill To:</h3>
            <div>{{ $invoice->lead->name }}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Services</th>
                    <th style="text-align: right">Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice->invoice_items as $item)
                <tr>
                    <td>
                        <div style="font-weight: 500;">{{ $item->service_name }}</div>
                        @if($item->description)
                            <div style="font-size: 12px; color: #666; margin-top: 5px;">
                                {{ $item->description }}
                            </div>
                        @endif
                    </td>
                    <td style="text-align: right">Rs. {{ number_format($item->amount, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <div class="amounts">
            <div class="amount-row">
                <strong>Total Amount:</strong> Rs. {{ number_format($invoice->total_amount, 2) }}
            </div>
            <div class="amount-row">
                <strong>Amount Received:</strong> Rs. {{ number_format($invoice->amount_received, 2) }}
            </div>
            <div class="amount-row" style="font-weight: 600; font-size: 15px;">
                <strong>Remaining Amount:</strong> Rs. {{ number_format($invoice->amount_remaining, 2) }}
            </div>
        </div>

        <div class="terms">
            <h4>Terms and Conditions</h4>
            <ul>
                @foreach($terms as $term)
                    <li>{{ $term }}</li>
                @endforeach
            </ul>
        </div>
    </div>

    <div class="footer">
        This is a computer-generated invoice that can be verified through invoice number at {{ $company['website'] }}
    </div>
</body>
</html> 