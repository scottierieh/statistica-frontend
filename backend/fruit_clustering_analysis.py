
import sys
import json
import numpy as np
import matplotlib.pyplot as plt
import base64
from PIL import Image
import io
from fruits_300_data import fruits_base64 # Assuming this file exists and contains the base64 string

def main():
    try:
        # Load data from stdin
        payload = json.load(sys.stdin)
        user_image_data_url = payload.get('image')

        # Load the base fruit data
        fruits_decoded = base64.b64decode(fruits_base64)
        fruits = np.load(io.BytesIO(fruits_decoded))

        apple = fruits[0:100].reshape(-1, 100*100)
        pineapple = fruits[100:200].reshape(-1, 100*100)
        banana = fruits[200:300].reshape(-1, 100*100)

        # Process user's image
        header, encoded = user_image_data_url.split(",", 1)
        image_data = base64.b64decode(encoded)
        user_image = Image.open(io.BytesIO(image_data)).convert('L').resize((100, 100))
        user_image_np = np.array(user_image)

        # Find which cluster the user image belongs to
        apple_mean = np.mean(apple, axis=0)
        pineapple_mean = np.mean(pineapple, axis=0)
        banana_mean = np.mean(banana, axis=0)

        dist_apple = np.mean(np.abs(user_image_np.flatten() - apple_mean))
        dist_pineapple = np.mean(np.abs(user_image_np.flatten() - pineapple_mean))
        dist_banana = np.mean(np.abs(user_image_np.flatten() - banana_mean))

        distances = {'apple': dist_apple, 'pineapple': dist_pineapple, 'banana': dist_banana}
        user_image_cluster = min(distances, key=distances.get)

        # Find closest images in each cluster
        def find_closest(cluster_data_3d, mean_img_flat):
            abs_diff = np.abs(cluster_data_3d - mean_img_flat.reshape(100, 100))
            abs_mean = np.mean(abs_diff, axis=(1, 2))
            closest_indices = np.argsort(abs_mean)[:10]
            images_b64 = []
            for idx in closest_indices:
                img = Image.fromarray(cluster_data_3d[idx])
                buf = io.BytesIO()
                img.save(buf, format='PNG')
                images_b64.append('data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('utf-8'))
            return images_b64
        
        closest_images = {
            'apple': find_closest(fruits[0:100], apple_mean),
            'banana': find_closest(fruits[200:300], banana_mean),
            'pineapple': find_closest(fruits[100:200], pineapple_mean)
        }
        
        # Generate mean images
        def generate_mean_image(mean_flat):
            mean_img = mean_flat.reshape(100,100)
            img = Image.fromarray(mean_img.astype(np.uint8))
            buf = io.BytesIO()
            img.save(buf, format='PNG')
            return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('utf-8')
            
        mean_images = {
            'apple': generate_mean_image(apple_mean),
            'banana': generate_mean_image(banana_mean),
            'pineapple': generate_mean_image(pineapple_mean),
        }

        response = {
            'user_image_cluster': user_image_cluster,
            'closest_images': closest_images,
            'mean_images': mean_images,
            'histograms': {} # Histogram generation is omitted for simplicity in this backend
        }
        
        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
