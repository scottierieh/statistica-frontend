
import sys
import json
import qrcode
import io
import base64

def main():
    try:
        # URL is passed as a command line argument for simplicity with GET requests
        if len(sys.argv) < 2:
            raise ValueError("No URL provided")
            
        url_to_encode = sys.argv[1]

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(url_to_encode)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')

        response = {
            'image': f"data:image/png;base64,{img_base64}"
        }
        
        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
