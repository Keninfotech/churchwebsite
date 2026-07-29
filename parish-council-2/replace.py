import re

html_file = r'c:\Users\Sunith K\Downloads\ols-parish-redesign-v3\parish-council-2\index.html'

with open(html_file, 'r', encoding='utf-8') as f:
    content = f.read()

names = [
    'St. Alphonsa - Vidya Nagar / Hebbagodi / Surya City',
    'St. Kuriakose Chavara - Behind Suvidya / Opp to Biocon',
    'St. Antony - Singasandra',
    'St. Mary\'s - Yarandahalli / RK Township',
    'St. Evuprasayamma - Ananthnagara / Arana',
    'St. Mother Theresa - GPR Layout',
    'St. Michael\'s - Ananthnagar / Vasundara Layout',
    'St. Peter - Hosa Road',
    'St. Francis De Sales - SFS Enclave',
    'St. Sebastian - Kammasandra',
    'St. George - Ittina Neela / Dollars Town',
    'St. Thomas - Electronic city Phase-I',
    'St. Joseph - Electronic City Phase-II',
    'St. Vincent de Paul - Daddy\'s Garden',
    'St. Jude - Huskur/Chikkanagamangala'
]

parts = content.split('<h3>Council Members</h3>')

new_content = parts[0]
for i, name in enumerate(names):
    new_content += f'<h3>{name}</h3>' + parts[i+1]

# Rejoin the remaining parts if any (e.g., group 16, 17)
if len(parts) > 16:
    for i in range(15, len(parts)-1):
        new_content += '<h3>Council Members</h3>' + parts[i+1]

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Replaced titles successfully.')
