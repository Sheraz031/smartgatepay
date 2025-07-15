import companyModel from '../models/companyModel.js';
import Logger from '../utils/logger.js';

export const createCompany = async (req, res) => {
  try {
    const { name, contactPerson, email, phone, address, status } = req.body;
    const userId = req.body.userId;

    Logger.info('Creating new company', {
      name,
      email,
      status: status,
      hasPhone: !!phone,
      hasAddress: !!address,
    });

    if (!name || !email) {
      Logger.warn('Missing required fields for company creation', {
        hasName: !!name,
        hasEmail: !!email,
      });
      return res.status(409).json({
        success: false,
        message: 'All required fields are missing',
      });
    }

    const existingCompany = await companyModel.findOne({ email });
    if (existingCompany) {
      Logger.warn('company with Email is already registered', { email });
      return res.status(409).json({
        success: false,
        message: 'company with Email is already registered',
      });
    }

    Logger.debug('Creating company in database');
    const newCompany = await companyModel.create({
      name,
      contactPerson,
      email,
      phone,
      address,
      status,
      createdBy: userId,
    });

    Logger.success('company created successfully', {
      id: newCompany._id,
      email,
    });

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      newCompany,
    });
  } catch (error) {
    Logger.error('Error creating company', {
      error: error.message,
      email: req.body.email ?? '',
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getCompanies = async (req, res) => {
  try {
    Logger.info('Getting all company data');
    const userId = req.body.userId;
    const role = req.body.role;

    let companies;

    if (role === 'admin') {
      companies = await companyModel.find().sort({ createdAt: -1 });
    } else {
      companies = await companyModel.find({ createdBy: userId }).sort({
        createdAt: -1,
      });
    }
    Logger.success('company data retrieved successfully');
    res.status(200).json({ success: true, companies });
  } catch (error) {
    Logger.error('Error getting company data', {
      error: error.message,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId;
    const role = req.body.role;
    Logger.info('Getting company data', { id });
    let company;

    if (role === 'admin') {
      company = await companyModel.findById(id);
    } else {
      company = await companyModel.findOne({ _id: id, createdBy: userId });
    }

    if (!company) {
      return res.json({ success: false, message: 'Company not found' });
    }

    Logger.success('Company data retrieved successfully', {
      id,
    });
    res.status(200).json({ success: true, company });
  } catch (error) {
    Logger.error('Error getting company data', {
      error: error.message,
      id: req.body.id,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId;
    const role = req.body.role;
    Logger.info('Updating company data', { id });

    let updatedCompany;

    if (role === 'admin') {
      updatedCompany = await companyModel.findByIdAndUpdate(id, req.body, {
        new: true,
      });
    } else {
      updatedCompany = await companyModel.findOneAndUpdate(
        { _id: id, createdBy: userId },
        req.body,
        { new: true }
      );
    }

    if (!updatedCompany) {
      Logger.warn('Company not found', { id });
      return res.json({
        success: false,
        message: 'Company not found or unauthorized',
      });
    }

    Logger.success('Company data updated successfully', {
      id,
    });
    res.status(200).json({ success: true, company: updatedCompany });
  } catch (error) {
    Logger.error('Error getting company data', {
      error: error.message,
      id: req.body.id,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    Logger.info('Deleting company data', { id });
    const userId = req.body.userId;
    const role = req.body.role;

    let deletedCompany;

    if (role === 'admin') {
      deletedCompany = await companyModel.findByIdAndDelete(id);
    } else {
      deletedCompany = await companyModel.findOneAndDelete({
        _id: id,
        createdBy: userId,
      });
    }

    if (!deletedCompany) {
      Logger.warn('Company not found', { id });
      return res.json({
        success: false,
        message: 'Company not found or unauthorized',
      });
    }

    res.status(200).json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    Logger.error('Error getting company data', {
      error: error.message,
      id: req.body.id,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};
