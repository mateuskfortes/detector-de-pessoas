from django.shortcuts import render
from django.views import View
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from PIL import Image
import io
from ultralytics import YOLO

# Load a COCO-pretrained YOLO11n model
model = YOLO("yolo11n.pt")

def detect_people_in_image(image):
    """
    Detecta pessoas em uma imagem usando YOLO11.
    
    Args:
        image: PIL Image object
        
    Returns:
        list: Lista com informações de todas as pessoas detectadas
    """
    results = model.predict(image, classes=[0])
    boxes = results[0].boxes

    if not boxes or len(boxes) == 0:
        return []

    all_people = []
    for box in boxes:
        person_data = {
            'confidence': round(float(box.conf[0]), 3),
            'position': {
                'xyxy': {
                    'x1': round(box.xyxy[0][0].item(), 2),
                    'y1': round(box.xyxy[0][1].item(), 2),
                    'x2': round(box.xyxy[0][2].item(), 2),
                    'y2': round(box.xyxy[0][3].item(), 2)
                }
            }
        }
        all_people.append(person_data)

    return all_people

@method_decorator(csrf_exempt, name='dispatch')
class HomeView(View):
    def get(self, request):
        return render(request, "home.html")

@method_decorator(csrf_exempt, name='dispatch')
class UploadView(View):
    def get(self, request):
        return render(request, "upload.html")
    
    def post(self, request):
        uploaded_file = request.FILES.get('image')
        if not uploaded_file:
            return JsonResponse({'error': 'Nenhuma imagem enviada.'}, status=400)

        try:
            # Lê e converte a imagem
            image_bytes = uploaded_file.read()
            image = Image.open(io.BytesIO(image_bytes))
            
            all_people = detect_people_in_image(image)
            
            return JsonResponse({
                'all_people': all_people
            })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class CameraView(View):
    def get(self, request):
        return render(request, "camera.html")
    
    def post(self, request):
        uploaded_file = request.FILES.get('image')
        if not uploaded_file:
            return JsonResponse({'error': 'Nenhuma imagem enviada.'}, status=400)

        try:
            image_bytes = uploaded_file.read()
            image = Image.open(io.BytesIO(image_bytes))
            
            all_people = detect_people_in_image(image)
            
            return JsonResponse({
                'all_people': all_people
            })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

