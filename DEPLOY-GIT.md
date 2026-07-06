# Git + Netlify 部署

## 1. 初始化后首次提交

```powershell
git add .
git commit -m "Initial portfolio site"
```

如果提示没有 `user.name` 或 `user.email`，先执行：

```powershell
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

## 2. 推到 GitHub

在 GitHub 新建一个空仓库，然后执行：

```powershell
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

## 3. 在 Netlify 连接仓库

1. 登录 Netlify
2. 选择 `Add new site` -> `Import an existing project`
3. 连接 GitHub
4. 选择这个仓库
5. 保持 Netlify 读取仓库内的 `netlify.toml`
6. 点击部署

## 4. 以后更新项目

```powershell
.\update-portfolio-data.cmd
git add .
git commit -m "Update portfolio content"
git push
```

推送后，Netlify 会自动重新发布。
