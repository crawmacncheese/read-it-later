# Read It Later

Read It Later is an app that allows users to save websites and pages for reading offline. 

## ✨ Features
- Save articles and web pages for later reading
- Offline access to saved content
- Basic bookmarks management (add, edit, delete and search)
- Content extraction/summarization
- Full-text search across all saved content
- Mark and highlight important sections within saved articles
- Customizable reading list with priority levels
- Cloud backup and synchronization of saved content


## 🧰 Tech Stack

- TypeScript/JavaScript
- Springboot

<!-- ## 📸 Demo -->

<!-- ![Demo GIF](https://your-demo-link.com/demo.gif)  
[Live Site](https://your-live-site.com) -->

## 📦 Installation

Clone the repo and install dependencies:

```bash
git clone https://github.com/yourusername/project-name.git
cd project-name
pip install -r requirements.txt
```

## 🛠 Usage
TBD

## Postman (Auth Flow)

- Import `postman/read-it-later-auth.postman_collection.json`
- (Optional) Import `postman/read-it-later.local.postman_environment.json`
- Run requests in order:
  - `Auth - Register` (generates a unique email/password)
  - `Auth - Login (stores token)` (saves JWT into `{{token}}`)
  - `Users - Profile (authorized)`
  - `Users - Profile (missing token should be blocked)`
<!-- 
Run the app:

```bash
python main.py
```

Example command or input/output:

```bash
$ python main.py --mode test
>> Running test mode...
``` -->




<!-- ## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you’d like to change. -->

<!-- ## 📄 License

MIT License  
See `LICENSE` file for details. -->

## Credits

Inspired by [Pocket](https://github.com/Pocket)  
<!-- Thanks to [@contributor](https://github.com/contributor) for feedback and suggestions.# 
