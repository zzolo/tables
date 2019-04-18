/**
 * Example models function for Tables
 */

module.exports = (db, Sequelize, options) => {
  // this context should be Tables object
  class Complaint extends Sequelize.Model {}
  Complaint.init(
    {
      id: {
        tablesInputColumn: 'Unique Key',
        field: 'id',
        type: Sequelize.STRING(128),
        primaryKey: true
      },
      type: {
        tablesInputColumn: 'Complaint Type',
        field: 'type',
        type: Sequelize.STRING(128)
      },
      description: {
        tablesInputColumn: 'Descriptor',
        field: 'description',
        type: Sequelize.TEXT
      }
    },
    {
      sequelize: db,
      tableName: 'complaints',
      timestamps: false,
      underscored: true,
      freezeTableName: true
    }
  );

  return {
    complaint: Complaint
  };
};
