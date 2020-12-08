#! /usr/bin/env node
// 引入依赖
const { Command } = require('commander');
const program = new Command();
const package = require('../package');
// const { parseCmdParams } = require('../src/util/util');
const { CreateCommand } = require('../src/command/create');
// 定义版本和参数选项

program
  .version(package.version, '-v, --version')
  .option('-i, --init', 'init something')

// 调用command方法，创建一个create命令,同时create命令后面必须跟一个命令参数<project-name>
program.command('create <project-name>')

  // 定义该命令的描述
  .description('创建<project-name>项目')

  // 指定额外参数
  .option('-f, --force', '忽略文件夹检查，如果已存在则直接覆盖')

  /**
   * 定义实现逻辑
   * source表示<project-name>参数
   * destination表示终端的cmd对象
   */
  .action((source, destination) => {
    new CreateCommand(source, destination)
  });

//解析对应参数
program.parse(process.argv);

//如果用户输入了上述参数，则会触发的事件
if (program.init) {
  console.log('init something')
}
