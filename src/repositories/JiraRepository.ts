import { Inject, Injectable } from '@nestjs/common';
import mysql from 'mysql2';

@Injectable()
export class JiraRepository {
  private connection: mysql.Connection;

  constructor(@Inject('CONNECTION') connection: mysql.Connection) {
    this.connection = connection;
  }

  async getIssueWorklog(issueID: number): Promise<any> {
    return new Promise((res) => {
      const query = `select t.pname type
                      ,u.lower_user_name user
                      ,c.display_name name
                      ,c.lower_email_address email
                      ,cast(w.startdate as date) created
                      ,i.summary
                      ,w.timeworked
                      ,s.pname status
                  from worklog w
                  inner join jiraissue i on i.ID = w.issueID
                  inner join issuestatus s on s.ID = i.issuestatus
                  inner join app_user u on u.user_key = w.author
                  inner join cwd_user c on u.lower_user_name = c.lower_user_name
                  inner join issuetype t on t.id = i.issuetype
                  where i.ID = ${issueID}
                  order by email
                    ,created
                    ,type`;
      this.connection.execute(query, (e, rows) => {
        if (e) throw e;
        res(rows);
      });
    });
  }

  async getProjectIssues(project: number): Promise<any> {
    return new Promise((res) => {
      const query = `SELECT i.ID,
          concat(p.pkey, '-', i.issuenum) pKey
        FROM jiraissue i
        INNER JOIN project p on i.PROJECT = p.ID
        WHERE p.ID = ${project}`;
      this.connection.execute(query, (e, rows) => {
        if (e) throw e;
        res(rows);
      });
    });
  }

  async getPairProgrammingSubtasks(
    project: number,
    date: string,
  ): Promise<any> {
    return new Promise((res) => {
      const query = `SELECT w.issueID,
          u.lower_user_name author,
          a.lower_user_name assignee,
          concat(p.pkey, '-', i.issuenum) pkey,
          f.finished,
          sum(w.timeworked) timeworked
        FROM worklog w
        INNER JOIN jiraissue i ON i.ID = w.issueID
        INNER JOIN app_user u ON u.user_key = w.author
        INNER JOIN project p ON p.ID = i.PROJECT
        LEFT JOIN app_user a ON a.user_key = assignee
        INNER JOIN
        (SELECT g.issueid,
          max(g.created) finished
          FROM changeitem i
          INNER JOIN changegroup g ON g.id = i.groupid
          WHERE i.field = 'status'
            AND i.newvalue = 10125
          GROUP BY g.issueid) f ON f.issueid = w.issueid
        WHERE i.PROJECT = ${project}
        AND i.issuetype = 10003
        AND i.created >= ${date}
        AND i.issuestatus = 10125
        AND w.issueID in
          (SELECT w.issueID
            FROM worklog w
            INNER JOIN jiraissue i ON i.ID = w.issueID
            WHERE i.PROJECT = ${project}
              AND i.issuetype = 10003
              AND i.created >= ${date}
              AND i.issuestatus = 10125
            GROUP BY w.issueID
            HAVING count(DISTINCT w.author) > 1)
        GROUP BY w.issueID ,
                u.lower_user_name,
                a.lower_user_name,
                f.finished
        ORDER BY issueID, timeworked desc`;
      this.connection.execute(query, (e, rows) => {
        if (e) throw e;
        res(rows);
      });
    });
  }

  async getSingleUSerSubtasks(project: number, date: string): Promise<any> {
    return new Promise((res) => {
      const query = `SELECT w.issueID,
          u.lower_user_name author,
          f.finished,
          concat(p.pkey, '-', i.issuenum) pkey,
          sum(w.timeworked) timeworked
        FROM worklog w
        INNER JOIN jiraissue i ON i.ID = w.issueID
        INNER JOIN app_user u ON u.user_key = w.author
        INNER JOIN project p ON p.ID = i.PROJECT
        INNER JOIN
        (SELECT g.issueid,
          max(g.created) finished
          FROM changeitem i
          INNER JOIN changegroup g ON g.id = i.groupid
          WHERE i.field = 'status'
            AND i.newvalue = 10125
          GROUP BY g.issueid) f ON f.issueid = w.issueid
        WHERE i.PROJECT = ${project}
        AND i.issuetype = 10003
        AND i.created >= ${date}
        AND i.issuestatus = 10125
        AND w.issueID in
          (SELECT w.issueID
            FROM worklog w
            INNER JOIN jiraissue i ON i.ID = w.issueID
            WHERE i.PROJECT = ${project}
              AND i.issuetype = 10003
              AND i.created >= ${date}
              AND i.issuestatus = 10125
            GROUP BY w.issueID
            HAVING count(DISTINCT w.author) = 1)
        GROUP BY w.issueID ,
                u.lower_user_name,
                f.finished
        ORDER BY issueID, timeworked desc`;
      this.connection.execute(query, (e, rows) => {
        if (e) throw e;
        res(rows);
      });
    });
  }
}
