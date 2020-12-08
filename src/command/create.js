#!/usr/bin/env node
const path = require('path');
const ora = require('ora');
const fs = require('fs-extra');
const download = require('download-git-repo');
const { copyFiles, parseCmdParams, getGitUser, runCmd, log } = require('../util/util');
const { exit } = require('process');
const inquirer = require('inquirer');
const { InquirerConfig, RepoPath } = require('./config');

/**
 * @description 创建项目
 * @param {} source 用户提供的文件夹名称
 * @param {} destination 用户输入的create命令的参数
 */
class Creator {
  constructor(source, destination, ops = {}) {
    this.source = source

    //解析得到的参数
    this.cmdParams = parseCmdParams(destination)
    this.RepoMaps = Object.assign({

      // 项目模板地址
      repo: RepoPath,

      // 临时缓存地址
      temp: path.join(__dirname, '../../__temp__'),

      // 项目目标存放地址
      target: this.genTargetPath(this.source)
    }, ops);

    // git信息
    this.gitUser = {}

    // 实例化菊花图
    this.spinner = ora()
    this.init()
  }

  // 生成目标文件夹的绝对路径
  genTargetPath(relPath = 'my-app-template') {

    // 构造路径
    return path.resolve(process.cwd(), relPath);
  }

  // 初始化函数
  async init() {
    try {

      // 检查文件夹是否存在
      await this.checkFolderExist();

      // 下载git上到项目模板到临时文件夹
      await this.downloadRepo();

      // 将资源文件复制到模板文件夹
      await this.copyRepoFiles();

      // 修改package.json内容
      await this.updatePkgFile();

      // 初始化git
      await this.initGit();

      // 安装依赖
      await this.runApp();
    } catch (error) {
      log.error(error);
      exit(1)
    } finally {

      // 菊花图停止转动
      this.spinner.stop();
    }
  }

  // 检查文件夹是否存在
  checkFolderExist() {
    return new Promise(async (resolve, reject) => {
      const { target } = this.RepoMaps
      // 如果create附加了--force或-f参数，则直接执行覆盖操作
      if (this.cmdParams.force) {
        await fs.removeSync(target)
        return resolve()
      }
      try {
        // 否则进行文件夹检查
        const isTarget = await fs.pathExistsSync(target)
        if (!isTarget) return resolve()

        const { recover } = await inquirer.prompt(InquirerConfig.folderExist);
        if (recover === 'cover') {
          await fs.removeSync(target);
          return resolve();
        } else if (recover === 'newFolder') {
          const { inputNewName } = await inquirer.prompt(InquirerConfig.rename);
          this.source = inputNewName;
          this.RepoMaps.target = this.genTargetPath(`./${inputNewName}`);
          return resolve();
        } else {
          exit(1);
        }
      } catch (error) {
        log.error(`[my-cli]Error:${error}`)
        exit(1);
      }
    })
  }

  // 下载repo资源
  downloadRepo() {
    this.spinner.start('正在拉取项目模板...');
    const { repo, temp } = this.RepoMaps
    return new Promise(async (resolve, reject) => {
      await fs.removeSync(temp);
      download(repo, temp, async err => {
        if (err) {
          this.spinner.fail('模版下载失败');
          return reject(err);
        }
        this.spinner.succeed('模版下载成功');
        return resolve()
      })
    })
  }

  // 拷贝repo资源
  async copyRepoFiles() {
    const { temp, target } = this.RepoMaps
    await copyFiles(temp, target, ['./git', './changelogs']);
  }

  // 更新package.json文件
  async updatePkgFile() {
    this.spinner.start('正在更新package.json...');
    const pkgPath = path.resolve(this.RepoMaps.target, 'package.json');
    const unnecessaryKey = ['keywords', 'license', 'files']
    const { name = '', email = '' } = await getGitUser();

    const jsonData = fs.readJsonSync(pkgPath);
    unnecessaryKey.forEach(key => delete jsonData[key]);
    Object.assign(jsonData, {
      name: this.source,
      author: name && email ? `${name} ${email}` : '',
      provide: true,
      version: "1.0.0"
    });
    await fs.writeJsonSync(pkgPath, jsonData, { spaces: '\t' })
    this.spinner.succeed('package.json更新完成！');
  }

  // 初始化git文件
  async initGit() {
    this.spinner.start('正在初始化Git管理项目...');
    await runCmd(`cd ${this.RepoMaps.target}`);
    process.chdir(this.RepoMaps.target);
    await runCmd(`git init`);
    this.spinner.succeed('Git初始化完成！');
  }

  // 安装依赖
  async runApp() {
    try {
      this.spinner.start('正在安装项目依赖文件，请稍后...');
      await runCmd(`npm install --registry=https://registry.npm.taobao.org`);
      this.spinner.succeed('依赖安装完成！');

      console.log('请运行如下命令启动项目吧：\n');
      log.success(`   cd ${this.source}`);
      log.success(`   npm run dev`);
    } catch (error) {
      console.log('项目安装失败，请运行如下命令手动安装：\n');
      log.success(`   cd ${this.source}`);
      log.success(`   npm install`);
    }
  }
}

exports.CreateCommand = Creator;