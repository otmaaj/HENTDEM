server {
    listen 80;
    server_name hentdem.ru www.hentdem.ru;
    location /static/ { alias /root/HENTDEM/static/; }
    location /media/ { alias /root/HENTDEM/media/; }
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }
}