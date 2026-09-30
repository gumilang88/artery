from PIL import Image, ImageDraw, ImageFilter
import json, urllib.request, io, os, re, math

W,H=1900,330
OUT='/home/gumilang/artery/public/preview/arc-hero-coins-preview.png'
os.makedirs(os.path.dirname(OUT),exist_ok=True)
raw=open('/tmp/artery_markets.json','rb').read().decode('utf-8','ignore')
raw=''.join(ch for ch in raw if ord(ch)>=32 or ch in '\n\r\t')
all_tokens=json.loads(raw).get('tokens',[])

def token(symbol):
    return next((dict(t) for t in all_tokens if str(t.get('symbol','')).upper()==symbol.upper()), {'symbol':symbol,'name':symbol,'logoURI':''})
upsidedown=next((dict(t) for t in all_tokens if 'UPSIDE' in str(t.get('name','')).upper()), {'symbol':'USDCAT','name':'UpSideDownCat','logoURI':''})
tokens=[token('cirBTC'),token('WETH'),{'symbol':'USDC','name':'USD Coin','logoURI':'file:///home/gumilang/artery/public/tokens/usdc.png'},token('EURC'),token('ARGUS'),token('TOLLY'),token('ARCMAN'),token('COOL'),upsidedown]

def fetch_img(url):
    if not url:return None
    try:
        if url.startswith('file://'):
            return Image.open(url[7:]).convert('RGBA')
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req,timeout=12) as r:data=r.read(4_000_000)
        im=Image.open(io.BytesIO(data)).convert('RGBA')
        im.thumbnail((512,512),Image.Resampling.LANCZOS)
        return im
    except Exception:return None

def circle_crop(im,size):
    if im is None:return None
    ratio=max(size/im.width,size/im.height)
    im=im.resize((max(size,int(im.width*ratio)),max(size,int(im.height*ratio))),Image.Resampling.LANCZOS)
    x=(im.width-size)//2;y=(im.height-size)//2
    im=im.crop((x,y,x+size,y+size))
    mask=Image.new('L',(size,size));ImageDraw.Draw(mask).ellipse((1,1,size-2,size-2),fill=255)
    im.putalpha(mask);return im

logos=[fetch_img(t.get('logoURI','')) for t in tokens]
colors=['#ff9638','#687cff','#28c69e','#39d1c6','#f15682','#795bff','#3cd0f2','#ff5e99','#ffd048','#aab5c7']
# Compact, overlapping exhibition arc. Realistic coin faces stay unobstructed.
positions=[
 (1050,132,80,112),(1178,104,84,130),(1306,126,82,116),(1434,94,84,134),(1562,126,80,114),
 (1115,216,90,102),(1262,202,94,112),(1409,213,92,104),(1556,202,94,112),
]
base=Image.new('RGBA',(W,H),(2,3,5,255))
# atmospheric bloom, confined behind the token group
bloom=Image.new('RGBA',(W,H),(0,0,0,0));bd=ImageDraw.Draw(bloom)
bd.ellipse((760,-80,1910,430),fill=(31,62,120,35));bd.ellipse((1180,-100,1990,400),fill=(115,35,155,24))
base=Image.alpha_composite(base,bloom.filter(ImageFilter.GaussianBlur(95)))

# Render rear row first, then front row to create clean occlusion.
for idx,(x,y,size,tower_h) in enumerate(positions):
    t=tokens[idx] if idx<len(tokens) else {'symbol':'?'}
    rgb=tuple(int(colors[idx][i:i+2],16) for i in (1,3,5))
    layer=Image.new('RGBA',(W,H),(0,0,0,0))
    d=ImageDraw.Draw(layer)
    top=y+size-2; collar_w=int(size*1.34); collar_h=int(size*.22); tower_w=int(size*1.10)
    # soft colored pool shadow
    glow=Image.new('RGBA',(W,H),(0,0,0,0));gd=ImageDraw.Draw(glow)
    gd.ellipse((x-collar_w//2-18,top-collar_h,x+collar_w//2+18,top+collar_h*2),fill=(*rgb,100))
    glow=glow.filter(ImageFilter.GaussianBlur(16));layer=Image.alpha_composite(layer,glow);d=ImageDraw.Draw(layer)
    # unified satin pedestal with subtle side lighting
    d.rounded_rectangle((x-tower_w//2,top,x+tower_w//2,min(H+20,top+tower_h)),radius=9,fill=(25,31,45,252))
    # cylindrical satin gradient: visible, but still darker than the coin
    for sx in range(x-tower_w//2,x+tower_w//2+1):
        rel=(sx-(x-tower_w//2))/max(1,tower_w)
        light=.20+.80*math.sin(math.pi*rel)
        c=(int(18+25*light),int(23+29*light),int(34+42*light),245)
        d.line((sx,top+7,sx,min(H,top+tower_h-4)),fill=c)
    d.line((x-tower_w//2+2,top+9,x-tower_w//2+2,min(H,top+tower_h-4)),fill=(*rgb,80),width=2)
    d.line((x+tower_w//2-3,top+9,x+tower_w//2-3,min(H,top+tower_h-4)),fill=(255,255,255,28),width=2)
    # restrained collar—less neon, more polished
    d.ellipse((x-collar_w//2,top-collar_h//2,x+collar_w//2,top+collar_h),fill=(*rgb,205),outline=(227,236,246,190),width=2)
    d.ellipse((x-int(collar_w*.39),top-int(collar_h*.19),x+int(collar_w*.39),top+int(collar_h*.55)),fill=(225,232,241,90))
    # thick metal coin edge, inner bezel, then token artwork
    d.ellipse((x-size//2-2,y+8,x+size//2+2,y+size+13),fill=(5,7,12,245),outline=(*rgb,210),width=4)
    d.ellipse((x-size//2,y,x+size//2,y+size),fill=(226,231,239,255),outline=(255,255,255,240),width=2)
    d.ellipse((x-size//2+5,y+5,x+size//2-5,y+size-5),fill=(*rgb,255),outline=(80,88,105,190),width=2)
    logo=circle_crop(logos[idx] if idx<len(logos) else None,int(size*.76))
    if logo:layer.alpha_composite(logo,(x-logo.width//2,y+(size-logo.height)//2))
    else:
        label=re.sub(r'[^A-Za-z0-9]','',str(t.get('symbol','?')))[:4].upper() or '?'
        box=d.textbbox((0,0),label);tw=box[2]-box[0];th=box[3]-box[1]
        d.text((x-tw//2,y+size//2-th//2),label,fill='white',stroke_width=1,stroke_fill=(0,0,0,200))
    # consistent gloss
    d.arc((x-size//2+5,y+5,x+size//2-5,y+size-5),195,322,fill=(255,255,255,180),width=3)
    base=Image.alpha_composite(base,layer)

# Smooth bottom fade only; no object clipping artifacts.
over=Image.new('RGBA',(W,H),(0,0,0,0));od=ImageDraw.Draw(over)
for yy in range(H-48,H):
    a=int(170*((yy-(H-48))/48)**1.5);od.line((0,yy,W,yy),fill=(2,3,5,a))
# fade-in bridge from text side
for xx in range(690,860):
    a=int(130*(1-(xx-690)/170));od.rectangle((xx,0,xx+1,H),fill=(2,3,5,a))
base=Image.alpha_composite(base,over)
base.convert('RGB').save(OUT,quality=96)
print(OUT)
print('selected',[(t.get('symbol'),t.get('name')) for t in tokens])
print('logos_downloaded',sum(x is not None for x in logos))
